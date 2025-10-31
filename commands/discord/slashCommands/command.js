const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Logger = require('../../../utils/logger');
const { client } = require('../../../core/client');

// 只允許 bot owner 使用
function isOwner(userId) {
    // TODO: 從 config.toml 讀取 owner id
    return userId === '240844873577078784'; // Jimmy4Real 的 Discord ID
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('command')
        .setDescription('指令管理命令')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('列出所有 Minecraft 指令')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setDescription('加載 Minecraft 指令')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('指令名稱')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unload')
                .setDescription('卸載 Minecraft 指令')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('指令名稱')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('重新載入 Minecraft 指令')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('指令名稱（留空則重新載入所有指令）')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        ),
    
    async autocomplete(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'command') {
            const commandNames = Object.keys(client.mcCommands);
            const filtered = commandNames.filter(name =>
                name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            
            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        }
    },

    async execute(interaction) {
        // 權限檢查
        if (!isOwner(interaction.user.id)) {
            await interaction.reply({
                content: '❌ 只有機器人管理員可以使用此命令',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const commandName = interaction.options.getString('command');

        await interaction.deferReply({ ephemeral: true });

        try {
            switch (subcommand) {
                case 'list':
                    await handleList(interaction);
                    break;
                case 'load':
                    await handleLoad(interaction, commandName);
                    break;
                case 'unload':
                    await handleUnload(interaction, commandName);
                    break;
                case 'reload':
                    await handleReload(interaction, commandName);
                    break;
            }
        } catch (error) {
            Logger.error(`[Discord] 指令管理命令執行失敗:`, error);
            await interaction.editReply({
                content: `❌ 執行失敗: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

async function handleList(interaction) {
    const { mcClient } = require('../../../core/client');
    const commandNames = Object.keys(client.mcCommands).sort();
    
    if (commandNames.length === 0) {
        await interaction.editReply({
            content: '📋 目前沒有註冊的 Minecraft 指令'
        });
        return;
    }

    // 分頁顯示
    const pageSize = 20;
    const pages = [];
    for (let i = 0; i < commandNames.length; i += pageSize) {
        pages.push(commandNames.slice(i, i + pageSize));
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Minecraft 指令列表')
        .setDescription(pages[0].map(cmd => `\`${cmd}\``).join(', '))
        .setFooter({ text: `共 ${commandNames.length} 個指令 (第 1/${pages.length} 頁)` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleLoad(interaction, commandName) {
    try {
        const { registerCommands } = require('../../../commands/discord');
        await registerCommands(commandName);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Minecraft 指令已加載')
            .setDescription(`指令 ${commandName} 已成功加載`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 加載指令: ${commandName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 加載失敗')
            .setDescription(`指令 ${commandName} 加載失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 加載 Minecraft 指令 ${commandName} 失敗:`, error);
    }
}

async function handleUnload(interaction, commandName) {
    try {
        const { unregisterCommand } = require('../../../commands/discord');
        await unregisterCommand(commandName);
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('✅ Minecraft 指令已卸載')
            .setDescription(`指令 ${commandName} 已成功卸載`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 卸載指令: ${commandName}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 卸載失敗')
            .setDescription(`指令 ${commandName} 卸載失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 卸載指令 ${commandName} 失敗:`, error);
    }
}

async function handleReload(interaction, commandName) {
    try {
        const { registerCommands } = require('../../../commands/discord');
        const targetCommand = commandName || 'all';
        await registerCommands(targetCommand);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Minecraft 指令已重新載入')
            .setDescription(targetCommand === 'all' ? '所有指令已成功重新載入' : `指令 ${commandName} 已成功重新載入`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.info(`[Discord] ${interaction.user.tag} 重新載入指令: ${targetCommand}`);
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ 重新載入失敗')
            .setDescription(`重新載入失敗: ${error.message}`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        Logger.error(`[Discord] 重新載入指令失敗:`, error);
    }
}
