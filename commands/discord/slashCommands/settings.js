const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { userRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const toml = require('smol-toml');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setNameLocalizations({
            'zh-TW': '設定'
        })
        .setDescription('View or modify settings')
        .setDescriptionLocalizations({
            'zh-TW': '查看或修改設定'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setNameLocalizations({
                    'zh-TW': '查看'
                })
                .setDescription('View current settings')
                .setDescriptionLocalizations({
                    'zh-TW': '查看目前設定'
                })
        )
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('admin')
                .setNameLocalizations({
                    'zh-TW': '管理員'
                })
                .setDescription('admin settings modification')
                .setDescriptionLocalizations({
                    'zh-TW': '修改管理員設定'
                })
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setNameLocalizations({
                            'zh-TW': '新增'
                        })
                        .setDescription('make a minecraft player a bot admin')
                        .setDescriptionLocalizations({
                            'zh-TW': '新增一位 Minecraft 玩家為機器人管理員'
                        })
                        .addStringOption(option =>
                            option
                                .setName('mc_username')
                                .setNameLocalizations({
                                    'zh-TW': 'mcid'
                                })
                                .setDescription('Minecraft username to be added as admin')
                                .setDescriptionLocalizations({
                                    'zh-TW': '要新增為管理員的 Minecraft 使用者名稱'
                                })
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setNameLocalizations({
                            'zh-TW': '移除'
                        })
                        .setDescription('remove a bot admin by minecraft player')
                        .setDescriptionLocalizations({
                            'zh-TW': '移除一位機器人管理員'
                        })
                        .addStringOption(option =>
                            option
                                .setName('mc_username')
                                .setNameLocalizations({
                                    'zh-TW': 'mcid'
                                })
                                .setDescription('Minecraft username to be removed from admin')
                                .setDescriptionLocalizations({
                                    'zh-TW': '要移除的管理員 Minecraft 使用者名稱'
                                })
                                .setRequired(true)
                        )
                )
        )
        .addSubcommandGroup(subcommandGroup =>
            subcommandGroup
                .setName('bet')
                .setNameLocalizations({
                    'zh-TW': '對賭'
                })
                .setDescription('betting settings modification')
                .setDescriptionLocalizations({
                    'zh-TW': '修改對賭設定'
                })
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set_min_max')
                        .setNameLocalizations({
                            'zh-TW': '設定最小最大值'
                        })
                        .setDescription('set minimum and maximum bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '設定最小與最大對賭金額'
                        })
                        .addIntegerOption(option =>
                            option
                                .setName('emerald_min')
                                .setNameLocalizations({
                                    'zh-TW': '綠寶石最小值'
                                })
                                .setDescription('minimum bet amount in emeralds')
                                .setDescriptionLocalizations({
                                    'zh-TW': '最小對賭金額 (綠寶石)'
                                })
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('emerald_max')
                                .setNameLocalizations({
                                    'zh-TW': '綠寶石最大值'
                                })
                                .setDescription('maximum bet amount in emeralds')
                                .setDescriptionLocalizations({
                                    'zh-TW': '最大對賭金額 (綠寶石)'
                                })
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('coin_min')
                                .setNameLocalizations({
                                    'zh-TW': '村民錠最小值'
                                })
                                .setDescription('minimum bet amount in coins')
                                .setDescriptionLocalizations({
                                    'zh-TW': '最小對賭金額 (村民錠)'
                                })
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('coin_max')
                                .setNameLocalizations({
                                    'zh-TW': '村民錠最大值'
                                })
                                .setDescription('maximum bet amount in coins')
                                .setDescriptionLocalizations({
                                    'zh-TW': '最大對賭金額 (村民錠)'
                                })
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set_odds')
                        .setNameLocalizations({
                            'zh-TW': '設定賠率'
                        })
                        .setDescription('set betting odds')
                        .setDescriptionLocalizations({
                            'zh-TW': '設定對賭賠率'
                        })
                        .addNumberOption(option =>
                            option
                                .setName('emerald_odds')
                                .setNameLocalizations({
                                    'zh-TW': '綠寶石賠率'
                                })
                                .setDescription('betting odds for emeralds')
                                .setDescriptionLocalizations({
                                    'zh-TW': '綠寶石對賭賠率'
                                })
                        )
                        .addNumberOption(option =>
                            option
                                .setName('coin_odds')
                                .setNameLocalizations({
                                    'zh-TW': '村民錠賠率'
                                })
                                .setDescription('betting odds for coins')
                                .setDescriptionLocalizations({
                                    'zh-TW': '村民錠對賭賠率'
                                })
                        )
                )
        )
    ,

    async execute(interaction) {
        const configPath = path.join(__dirname, '../../../config.toml');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = toml.parse(configContent);
        const adminIds = config.general.discordAdmin || [];

        if (!adminIds.includes(interaction.user.id)) {
            await interaction.reply({
                content: '❌ 執行失敗: 無權限使用此指令',
                ephemeral: true
            });
            return;
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const dataConfigPath = path.join(__dirname, '../../../data/cfg.toml');

        try {
            if (subcommand === 'view') {
                const configContent = await fs.readFile(configPath, 'utf8');
                const dataConfigContent = await fs.readFile(dataConfigPath, 'utf8');
                const config = toml.parse(configContent);
                const dataConfig = toml.parse(dataConfigContent);

                const embed = new EmbedBuilder()
                    .setTitle('目前設定 (Current Settings)')
                    .setColor('Blue')
                    .addFields(
                        {
                            name: '管理員白名單 (Admin Whitelist)',
                            value: config.whitelist && config.whitelist.length > 0 ? config.whitelist.join(', ') : 'None'
                        },
                        {
                            name: '對賭設定 (Bet Settings)',
                            value: `**綠寶石賠率 (Emerald Odds):** ${dataConfig.bet?.eodds ?? 'N/A'}
**村民錠賠率 (Coin Odds):** ${dataConfig.bet?.codds ?? 'N/A'}
**綠寶石限制 (Emerald Limits):** ${dataConfig.bet?.eMin ?? 'N/A'} - ${dataConfig.bet?.eMax ?? 'N/A'}
**村民錠限制 (Coin Limits):** ${dataConfig.bet?.cMin ?? 'N/A'} - ${dataConfig.bet?.cMax ?? 'N/A'}`
                        }
                    );

                await interaction.reply({ embeds: [embed] });

            } else if (subcommandGroup === 'admin') {
                const mc_username = interaction.options.getString('mc_username');
                let configContent = await fs.readFile(configPath, 'utf8');
                let config = toml.parse(configContent);
                let whitelist = config.whitelist || [];

                if (subcommand === 'add') {
                    if (whitelist.includes(mc_username)) {
                        return interaction.reply({ content: `❌ ${mc_username} 已經在白名單中`, ephemeral: true });
                    }
                    whitelist.push(mc_username);
                } else if (subcommand === 'remove') {
                    if (!whitelist.includes(mc_username)) {
                        return interaction.reply({ content: `❌ ${mc_username} 不在白名單中`, ephemeral: true });
                    }
                    whitelist = whitelist.filter(u => u !== mc_username);
                }

                const newWhitelistStr = JSON.stringify(whitelist);
                const regex = /whitelist\s*=\s*\[(.*?)\]/s;

                if (regex.test(configContent)) {
                    configContent = configContent.replace(regex, `whitelist = ${newWhitelistStr}`);
                } else {
                    configContent += `\nwhitelist = ${newWhitelistStr}`;
                }

                await fs.writeFile(configPath, configContent, 'utf8');
                await interaction.reply({ content: `✅ 已${subcommand === 'add' ? '新增' : '移除'}管理員: ${mc_username}` });

            } else if (subcommandGroup === 'bet') {
                let dataConfigContent = await fs.readFile(dataConfigPath, 'utf8');
                let updates = [];

                if (subcommand === 'set_min_max') {
                    const eMin = interaction.options.getInteger('emerald_min');
                    const eMax = interaction.options.getInteger('emerald_max');
                    const cMin = interaction.options.getInteger('coin_min');
                    const cMax = interaction.options.getInteger('coin_max');

                    if (eMin !== null) updates.push({ key: 'eMin', val: eMin });
                    if (eMax !== null) updates.push({ key: 'eMax', val: eMax });
                    if (cMin !== null) updates.push({ key: 'cMin', val: cMin });
                    if (cMax !== null) updates.push({ key: 'cMax', val: cMax });

                } else if (subcommand === 'set_odds') {
                    const eOdds = interaction.options.getNumber('emerald_odds');
                    const cOdds = interaction.options.getNumber('coin_odds');

                    if (eOdds !== null) updates.push({ key: 'eodds', val: eOdds });
                    if (cOdds !== null) updates.push({ key: 'codds', val: cOdds });
                }

                for (const { key, val } of updates) {
                    const regex = new RegExp(`${key}\\s*=\\s*[\\d\\.]+`);
                    if (regex.test(dataConfigContent)) {
                        dataConfigContent = dataConfigContent.replace(regex, `${key} = ${val}`);
                    }
                }

                await fs.writeFile(dataConfigPath, dataConfigContent, 'utf8');
                await interaction.reply({ content: `✅ 設定已更新` });
            }
        } catch (error) {
            Logger.error('Error in settings command:', error);
            await interaction.reply({ content: '❌ 執行指令時發生錯誤', ephemeral: true });
        }
    }
};