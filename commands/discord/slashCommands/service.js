const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Logger = require('../../../utils/logger');
const serviceManager = require('../../../services/serviceManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('service')
        .setNameLocalizations({
            'zh-TW': '服務'
        })
        .setDescription('Manage bot services')
        .setDescriptionLocalizations({
            'zh-TW': '管理機器人服務'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setNameLocalizations({
                    'zh-TW': '列表'
                })
                .setDescription('List all services')
                .setDescriptionLocalizations({
                    'zh-TW': '列出所有服務'
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setNameLocalizations({
                    'zh-TW': '狀態'
                })
                .setDescription('Check service status')
                .setDescriptionLocalizations({
                    'zh-TW': '查看服務狀態'
                })
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setNameLocalizations({
                            'zh-TW': '服務'
                        })
                        .setDescription('Service name')
                        .setDescriptionLocalizations({
                            'zh-TW': '服務名稱'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setNameLocalizations({
                    'zh-TW': '載入'
                })
                .setDescription('Load a service')
                .setDescriptionLocalizations({
                    'zh-TW': '載入一個服務'
                })
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setNameLocalizations({
                            'zh-TW': '服務'
                        })
                        .setDescription('Service name')
                        .setDescriptionLocalizations({
                            'zh-TW': '服務名稱'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unload')
                .setNameLocalizations({
                    'zh-TW': '停用'
                })
                .setDescription('Unload a service')
                .setDescriptionLocalizations({
                    'zh-TW': '停用服務'
                })
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setNameLocalizations({
                            'zh-TW': '服務'
                        })
                        .setDescription('Service name')
                        .setDescriptionLocalizations({
                            'zh-TW': '服務名稱'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setNameLocalizations({
                    'zh-TW': '重新載入'
                })
                .setDescription('Reload a service or all services')
                .setDescriptionLocalizations({
                    'zh-TW': '重新載入一個服務或所有服務'
                })
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setNameLocalizations({
                            'zh-TW': '服務'
                        })
                        .setDescription('Service name (leave empty to reload all services)')
                        .setDescriptionLocalizations({
                            'zh-TW': '服務名稱（留空則重新載入所有服務）'
                        })
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        ),
    
    async autocomplete(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'service') {
            const serviceNames = serviceManager.getServiceNames();
            const filtered = serviceNames.filter(name =>
                name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            
            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        }
    },

    async execute(interaction) {
        // 權限檢查
        if (!interaction.member.permissions.has('Administrator') && interaction.user.id !== '1256550027040657409') {
            await interaction.reply({
                content: '❌ 執行失敗: 無權限使用此指令',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const serviceName = interaction.options.getString('service');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            switch (subcommand) {
                case 'list':
                    await handleList(interaction);
                    break;
                case 'status':
                    await handleStatus(interaction, serviceName);
                    break;
                case 'load':
                    await handleLoad(interaction, serviceName);
                    break;
                case 'unload':
                    await handleUnload(interaction, serviceName);
                    break;
                case 'reload':
                    await handleReload(interaction, serviceName);
                    break;
            }
        } catch (error) {
            Logger.error(`[Discord] 服務管理命令執行失敗:`, error);
            await interaction.editReply({
                content: `❌ 執行失敗: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

async function handleList(interaction) {
    const serviceNames = serviceManager.getServiceNames();
    
    if (serviceNames.length === 0) {
        await interaction.editReply({
            content: '📋 目前沒有註冊的服務'
        });
        return;
    }

    const statusList = serviceNames.map(name => {
        const status = serviceManager.getServiceStatus(name);
        const icon = status.loaded ? '✅' : '❌';
        return `${icon} ${name}`;
    });

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 服務列表')
        .setDescription(statusList.join('\n'))
        .setFooter({ text: `共 ${serviceNames.length} 個服務` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction, serviceName) {
    const status = serviceManager.getServiceStatus(serviceName);
    
    if (!status) {
        await interaction.editReply({
            content: `❌ 服務 ${serviceName} 不存在`
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(status.loaded ? '#00ff00' : '#ff6600')
        .setTitle(`📊 服務狀態: ${serviceName}`)
        .addFields(
            { name: '狀態', value: status.loaded ? '✅ 已載入' : '❌ 未載入', inline: true },
            { name: '版本', value: status.version, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleLoad(interaction, serviceName) {
    try {
        await serviceManager.initService(serviceName);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ 服務已載入')
            .setDescription(`服務 ${serviceName} 已成功載入`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 載入服務: ${serviceName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 載入失敗')
            .setDescription(`服務 ${serviceName} 載入失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 載入服務 ${serviceName} 失敗:`, error);
    }
}

async function handleUnload(interaction, serviceName) {
    try {
        await serviceManager.unloadService(serviceName);
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('✅ 服務已停用')
            .setDescription(`服務 ${serviceName} 已成功停用`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 停用服務: ${serviceName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 停用失敗')
            .setDescription(`服務 ${serviceName} 停用失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 停用服務 ${serviceName} 失敗:`, error);
    }
}

async function handleReload(interaction, serviceName) {
    try {
        const targetService = serviceName || 'all';
        await serviceManager.reloadService(targetService);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ 服務已重新載入')
            .setDescription(targetService === 'all' ? '所有服務已成功重新載入' : `服務 ${serviceName} 已成功重新載入`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 重新載入服務: ${targetService}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 重新載入失敗')
            .setDescription(`重新載入失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 重新載入服務失敗:`, error);
    }
}
