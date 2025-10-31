const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('查看或修改個人設定')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('查看目前的設定')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('查看帳戶資訊')
        ),
    
    async execute(interaction) {
        const discordID = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            // 查詢用戶
            const user = await userRepository.getUserByDiscordID(discordID);
            if (!user) {
                await interaction.editReply({
                    content: '❌ 找不到您的帳戶，請先使用 Minecraft 連結 Discord'
                });
                return;
            }

            if (subcommand === 'view') {
                // 顯示設定
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('⚙️ 個人設定')
                    .setDescription(`玩家: ${user.playerID}`)
                    .addFields(
                        { name: '權限等級', value: `${user.additionalInfo.permissionLevel}`, inline: true },
                        { name: '接受 EULA', value: user.additionalInfo.acceptEULA ? '✅ 是' : '❌ 否', inline: true },
                        { name: '帳戶類型', value: user.additionalInfo.linkType === 0 ? '本地' : '線上', inline: true },
                        { name: '黑名單狀態', value: user.additionalInfo.blacklist.status ? '❌ 是' : '✅ 正常', inline: true },
                        { name: '身份組', value: user.additionalInfo.rank || '無', inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                Logger.info(`[Discord] ${user.playerID} 查看個人設定`);

            } else if (subcommand === 'info') {
                // 顯示帳戶資訊
                const createDate = new Date(user.createDate * 1000);
                
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('👤 帳戶資訊')
                    .setDescription(`玩家: ${user.playerID}`)
                    .addFields(
                        { name: 'UUID', value: `\`${user.playerUUID}\``, inline: false },
                        { name: 'Discord ID', value: user.discordID ? `<@${user.discordID}>` : '未連結', inline: true },
                        { name: '創建日期', value: createDate.toLocaleString('zh-TW'), inline: true },
                        { name: '綠寶石錢包', value: `${user.eWallet || 0}`, inline: true },
                        { name: '村民錠錢包', value: `${user.cWallet || 0}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                Logger.info(`[Discord] ${user.playerID} 查看帳戶資訊`);
            }

        } catch (error) {
            Logger.error(`[Discord] 查看設定時發生錯誤:`, error);
            await interaction.editReply({
                content: '❌ 查看設定時發生錯誤，請稍後再試'
            });
        }
    }
};