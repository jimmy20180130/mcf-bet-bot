const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { userRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');

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
        if (!interaction.member.permissions.has('Administrator') && interaction.user.id !== '1256550027040657409') {
            await interaction.reply({
                content: '❌ 執行失敗: 無權限使用此指令',
                ephemeral: true
            });
            return;
        }


    }
};