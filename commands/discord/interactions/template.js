const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const toml = require('smol-toml');
const BetRecord = require('../../../models/BetRecord');
const RecordTemplate = require('../../../models/RecordTemplate');
const User = require('../../../models/User');
const minecraftDataService = require('../../../services/minecraftDataService');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
}

function normalizeTemplateCurrencyFilters(values = {}) {
    return {
        startTime: parseDate(values.startTime || values.laterThan || null),
        endTime: parseDate(values.endTime || values.earlierThan || null),
        minAmount: values.minAmount ?? values.greaterThan ?? null,
        maxAmount: values.maxAmount ?? values.lessThan ?? null
    };
}

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('recordTemplate')
        .setNameLocalizations({
            'zh-TW': '固定條件查詢'
        })
        .setType(ApplicationCommandType.User),

    name: 'recordTemplate',

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const requester = User.getByDiscordId(interaction.user.id);
        if (!requester) {
            await interaction.editReply({ content: '❌ 您尚未綁定 Minecraft 帳號。' });
            return;
        }

        const targetDiscordUser = interaction.targetUser;
        const targetUser = User.getByDiscordId(targetDiscordUser.id);

        if (!targetUser) {
            await interaction.editReply({ content: `❌ 使用者 <@${targetDiscordUser.id}> 尚未綁定 Minecraft 帳號。` });
            return;
        }

        // 簡陋版：直接使用你最新建立的模板
        const template = RecordTemplate.listOwn(interaction.user.id, 1)[0];
        if (!template) {
            await interaction.editReply({
                content: '❌ 你尚未建立模板，請先用 /template add 新增至少一個模板。'
            });
            return;
        }

        const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8'));
        const botUuid = template.filters?.bot || null;

        let botDisplayName = '所有機器人';
        if (botUuid) {
            const botData = await minecraftDataService.getPlayerId(botUuid);
            const botConfig = config.bots.find(b => b.uuid === botUuid);
            botDisplayName = botData || botConfig?.username || '未知機器人';
        }

        const templateEm = normalizeTemplateCurrencyFilters(template.filters?.emerald);
        const templateCoin = normalizeTemplateCurrencyFilters(template.filters?.coin);

        const emFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botUuid,
            currency: 'emerald',
            startTime: templateEm.startTime,
            endTime: templateEm.endTime,
            minAmount: templateEm.minAmount,
            maxAmount: templateEm.maxAmount
        };

        const coinFilters = {
            playeruuid: targetUser.playeruuid,
            bot: botUuid,
            currency: 'coin',
            startTime: templateCoin.startTime,
            endTime: templateCoin.endTime,
            minAmount: templateCoin.minAmount,
            maxAmount: templateCoin.maxAmount
        };

        const emStats = BetRecord.getStats(emFilters);
        const coinStats = BetRecord.getStats(coinFilters);

        const formatStats = (stats) => {
            const bet = stats.totalBetAmount || 0;
            const count = stats.totalBets || 0;
            return `下注金額: ${bet} | 下注次數: ${count}`;
        };

        const fields = [
            { name: '玩家 ID', value: targetUser.playerid, inline: true },
            { name: 'Discord', value: targetUser.discordid ? `<@${targetUser.discordid}>` : '尚未綁定', inline: true },
            { name: '查詢 BOT', value: botDisplayName, inline: true },
            { name: '玩家 UUID', value: targetUser.playeruuid, inline: false }
        ];

        if (emFilters.startTime || emFilters.endTime) {
            fields.push({ name: '綠寶石查詢期間', value: `${emFilters.startTime || '始'} ~ ${emFilters.endTime || '末'}`, inline: false });
        }
        fields.push({ name: '綠寶石', value: formatStats(emStats), inline: false });

        if (coinFilters.startTime || coinFilters.endTime) {
            fields.push({ name: '村民錠查詢期間', value: `${coinFilters.startTime || '始'} ~ ${coinFilters.endTime || '末'}`, inline: false });
        }
        fields.push({ name: '村民錠', value: formatStats(coinStats), inline: false });
        fields.push({ name: '使用模板', value: template.name, inline: false });

        const imageUrl = `https://minotar.net/helm/${targetUser.playeruuid}/64.png`;
        const embed = new EmbedBuilder()
            .setTitle('固定條件查詢')
            .setDescription(`查詢對象: <@${targetDiscordUser.id}>`)
            .addFields(fields)
            .setColor('#313338')
            .setThumbnail(imageUrl)
            .setFooter({ text: 'Jimmy Bot', iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
