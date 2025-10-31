const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Logger = require('../../../utils/logger');
const serviceManager = require('../../../services/serviceManager');

// 只允許 bot owner 使用
const OWNER_IDS = ['YOUR_OWNER_ID']; // TODO: 從設定檔讀取

function isOwner(userId) {
    // TODO: 從 config.toml 讀取 owner id
    return userId === '240844873577078784'; // Jimmy4Real 的 Discord ID
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('service')
        .setDescription('服務管理命令')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('列出所有服務')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('查看服務狀態')
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setDescription('服務名稱')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setDescription('加載服務')
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setDescription('服務名稱')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unload')
                .setDescription('卸載服務')
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setDescription('服務名稱')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('重新載入服務')
                .addStringOption(option =>
                    option
                        .setName('service')
                        .setDescription('服務名稱（留空則重新載入所有服務）')
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
        // if (!isOwner(interaction.user.id)) {
        //     await interaction.reply({
        //         content: '❌ 只有機器人管理員可以使用此命令',
        //         ephemeral: true
        //     });
        //     return;
        // }

        const subcommand = interaction.options.getSubcommand();
        const serviceName = interaction.options.getString('service');

        await interaction.deferReply({ ephemeral: true });

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
            { name: '狀態', value: status.loaded ? '✅ 已加載' : '❌ 未加載', inline: true },
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
            .setTitle('✅ 服務已加載')
            .setDescription(`服務 ${serviceName} 已成功加載`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 加載服務: ${serviceName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 加載失敗')
            .setDescription(`服務 ${serviceName} 加載失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 加載服務 ${serviceName} 失敗:`, error);
    }
}

async function handleUnload(interaction, serviceName) {
    try {
        await serviceManager.unloadService(serviceName);
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('✅ 服務已卸載')
            .setDescription(`服務 ${serviceName} 已成功卸載`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 卸載服務: ${serviceName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 卸載失敗')
            .setDescription(`服務 ${serviceName} 卸載失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 卸載服務 ${serviceName} 失敗:`, error);
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
