const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { rankRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');
const fs = require('fs');
const path = require('path');
const toml = require('smol-toml');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setNameLocalizations({
            'zh-TW': '身分組'
        })
        .setDescription('View or modify roles settings')
        .setDescriptionLocalizations({
            'zh-TW': '查看或修改身分組設定'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setNameLocalizations({ 'zh-TW': '列表' })
                .setDescription('List all roles')
                .setDescriptionLocalizations({ 'zh-TW': '列出所有身分組' })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setNameLocalizations({ 'zh-TW': '新增' })
                .setDescription('Add a new role')
                .setDescriptionLocalizations({ 'zh-TW': '新增身分組' })
                .addStringOption(option =>
                    option.setName('role_id')
                        .setDescription('Unique Role ID')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Discord Role')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Role Description')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('emerald_reward')
                        .setDescription('Daily Emerald Reward')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('coin_reward')
                        .setDescription('Daily Coin Reward')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('prefix')
                        .setDescription('Chat Prefix')
                        .setRequired(false)
                )
                .addNumberOption(option =>
                    option.setName('bonus_odds')
                        .setDescription('Bonus Odds (e.g. 0.1 for 10%)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setNameLocalizations({ 'zh-TW': '編輯' })
                .setDescription('Edit an existing role')
                .setDescriptionLocalizations({ 'zh-TW': '編輯身分組' })
                .addStringOption(option =>
                    option.setName('role_id')
                        .setDescription('Role ID to edit')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('New Discord Role')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New Description')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('emerald_reward')
                        .setDescription('New Daily Emerald Reward')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('coin_reward')
                        .setDescription('New Daily Coin Reward')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('prefix')
                        .setDescription('New Chat Prefix')
                        .setRequired(false)
                )
                .addNumberOption(option =>
                    option.setName('bonus_odds')
                        .setDescription('New Bonus Odds')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setNameLocalizations({ 'zh-TW': '刪除' })
                .setDescription('Delete a role')
                .setDescriptionLocalizations({ 'zh-TW': '刪除身分組' })
                .addStringOption(option =>
                    option.setName('role_id')
                        .setDescription('Role ID to delete')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setNameLocalizations({ 'zh-TW': '查看' })
                .setDescription('View role details')
                .setDescriptionLocalizations({ 'zh-TW': '查看身分組詳情' })
                .addStringOption(option =>
                    option.setName('role_id')
                        .setDescription('Role ID to view')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const ranks = await rankRepository.getAllRanks();
        const filtered = ranks.filter(rank => rank.rankID.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(rank => ({ name: rank.rankID, value: rank.rankID })).slice(0, 25)
        );
    },

    async execute(interaction) {
        // 讀取設定檔
        const configPath = path.join(__dirname, '../../../config.toml');
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = toml.parse(configContent);
        const adminIds = config.general.discordAdmin || [];

        if (!adminIds.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ 執行失敗: 無權限使用此指令',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'list') {
                const ranks = await rankRepository.getAllRanks();
                if (ranks.length === 0) {
                    return interaction.reply({ content: '目前沒有任何身分組設定。', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('身分組列表')
                    .setColor(0x00FF00)
                    .setTimestamp();

                ranks.forEach(rank => {
                    embed.addFields({
                        name: `${rank.rankName} (${rank.rankID})`,
                        value: `描述: ${rank.description}\n獎勵: 🟢 ${rank.dailyReward.emerald} / 🟡 ${rank.dailyReward.coin}\nDiscord: ${rank.discordID ? `<@&${rank.discordID}>` : '無'}\n前綴: ${rank.prefix || '無'}\n賠率加成: ${rank.bonusOdds}`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'add') {
                const roleID = interaction.options.getString('role_id');
                const role = interaction.options.getRole('role');
                const description = interaction.options.getString('description') || '無';
                const emeraldReward = interaction.options.getInteger('emerald_reward') || 0;
                const coinReward = interaction.options.getInteger('coin_reward') || 0;
                const prefix = interaction.options.getString('prefix');
                const bonusOdds = interaction.options.getNumber('bonus_odds') || 0;

                const rankData = {
                    rankID: roleID,
                    rankName: role.name,
                    description,
                    dailyReward: { emerald: emeraldReward, coin: coinReward },
                    discordID: role.id,
                    prefix: prefix || null,
                    bonusOdds
                };

                const success = await rankRepository.createRank(rankData);
                if (success) {
                    await interaction.reply({ content: `✅ 成功新增身分組: <@&${role.id}> (${roleID})` });
                } else {
                    await interaction.reply({ content: `❌ 新增身分組失敗，可能 ID 已存在。`, ephemeral: true });
                }

            } else if (subcommand === 'edit') {
                const roleID = interaction.options.getString('role_id');
                const rank = await rankRepository.getRankByID(roleID);

                if (!rank) {
                    return interaction.reply({ content: `❌ 找不到身分組 ID: ${roleID}`, ephemeral: true });
                }

                const updates = {};
                const role = interaction.options.getRole('role');
                if (role) {
                    updates.rankName = role.id;
                    updates.discordID = role.id;
                }
                
                const description = interaction.options.getString('description');
                if (description) updates.description = description;

                const emeraldReward = interaction.options.getInteger('emerald_reward');
                const coinReward = interaction.options.getInteger('coin_reward');
                
                if (emeraldReward !== null || coinReward !== null) {
                    updates.dailyReward = {
                        emerald: emeraldReward !== null ? emeraldReward : rank.dailyReward.emerald,
                        coin: coinReward !== null ? coinReward : rank.dailyReward.coin
                    };
                }

                const prefix = interaction.options.getString('prefix');
                if (prefix !== null) updates.prefix = prefix;

                const bonusOdds = interaction.options.getNumber('bonus_odds');
                if (bonusOdds !== null) updates.bonusOdds = bonusOdds;

                if (Object.keys(updates).length === 0) {
                    return interaction.reply({ content: '⚠️ 沒有提供任何修改內容。', ephemeral: true });
                }

                const success = await rankRepository.updateRank(roleID, updates);
                if (success) {
                    await interaction.reply({ content: `✅ 成功更新身分組: ${roleID}` });
                } else {
                    await interaction.reply({ content: `❌ 更新身分組失敗。`, ephemeral: true });
                }

            } else if (subcommand === 'delete') {
                const roleID = interaction.options.getString('role_id');
                
                const success = await rankRepository.deleteRank(roleID);
                if (success) {
                    await interaction.reply({ content: `✅ 成功刪除身分組: ${roleID}` });
                } else {
                    await interaction.reply({ content: `❌ 刪除身分組失敗，可能 ID 不存在。`, ephemeral: true });
                }

            } else if (subcommand === 'view') {
                const roleID = interaction.options.getString('role_id');
                const rank = await rankRepository.getRankByID(roleID);

                if (!rank) {
                    return interaction.reply({ content: `❌ 找不到身分組 ID: ${roleID}`, ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`身分組詳情: ${rank.rankID}`)
                    .setColor(0x0099FF)
                    .addFields(
                        { name: 'ID', value: rank.rankID, inline: true },
                        { name: '名稱', value: rank.rankName, inline: true },
                        { name: '描述', value: rank.description || '無', inline: false },
                        { name: '每日獎勵', value: `🟢 綠寶石: ${rank.dailyReward.emerald}\n🟡 金幣: ${rank.dailyReward.coin}`, inline: false },
                        { name: 'Discord 身分組', value: rank.discordID ? `<@&${rank.discordID}>` : '未連結', inline: true },
                        { name: '聊天前綴', value: rank.prefix || '無', inline: true },
                        { name: '賠率加成', value: `${rank.bonusOdds}`, inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            Logger.error(`Error in roles command:`, error);
            await interaction.reply({ content: '❌ 執行指令時發生未知錯誤', ephemeral: true });
        }
    }
};