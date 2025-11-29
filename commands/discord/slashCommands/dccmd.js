const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { client } = require('../../../core/client');
const Logger = require('../../../utils/logger');

// Store pending reloads on client to persist across reloads
if (!client.pendingReloads) {
    client.pendingReloads = new Map();
}

let reloadResultHandler = null;

function init() {
    reloadResultHandler = (result) => {
        const { success, commandName, message, error } = result;

        for (const [interactionId, pendingCommand] of client.pendingReloads.entries()) {
            if (pendingCommand === commandName) {
                const interaction = client.pendingInteractions?.get(interactionId);
                if (interaction) {
                    if (success) {
                        interaction.editReply({
                            content: `✅ ${message}`,
                            ephemeral: true
                        }).catch(err => Logger.error('[Discord Reload] 編輯回覆失敗:', err));
                    } else {
                        interaction.editReply({
                            content: `❌ ${message}`,
                            ephemeral: true
                        }).catch(err => Logger.error('[Discord Reload] 編輯回覆失敗:', err));
                        Logger.error(`[Discord Reload] 重新載入失敗:`, error);
                    }
                    client.pendingInteractions?.delete(interactionId);
                }
                client.pendingReloads.delete(interactionId);
            }
        }
    };
    // Listen for discord reload results emitted by commands/discord/index.js
    client.on('dcReloadResult', reloadResultHandler);
}

function cleanup() {
    if (reloadResultHandler) {
        client.removeListener('dcReloadResult', reloadResultHandler);
        reloadResultHandler = null;
    }
    // Don't clear pendingReloads during cleanup - they need to persist across reloads
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dccmd')
        .setNameLocalizations({
            'zh-TW': 'dc指令管理'
        })
        .setDescription('Manage Discord commands')
        .setDescriptionLocalizations({
            'zh-TW': '管理 Discord 指令'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setNameLocalizations({
                    'zh-TW': '重新載入'
                })
                .setDescription('Reload a Discord command')
                .setDescriptionLocalizations({
                    'zh-TW': '重新載入一個 Discord 指令'
                })
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setNameLocalizations({
                            'zh-TW': '指令'
                        })
                        .setDescription('Command name (leave blank to reload all commands)')
                        .setDescriptionLocalizations({
                            'zh-TW': '指令名稱（留空則重新載入所有指令）'
                        })
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        // 獲取所有可用的指令名稱
        const commandNames = ['all', ...client.dcCommands.keys()];
        
        // 過濾匹配的指令
        const filtered = commandNames.filter(name => 
            name.toLowerCase().includes(focusedValue.toLowerCase())
        ).slice(0, 25); // Discord 限制最多 25 個選項
        
        await interaction.respond(
            filtered.map(name => ({ name: name, value: name }))
        );
    },
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'reload') {
            const commandName = interaction.options.getString('command') || 'all';
            
            await interaction.deferReply({ flags: 64 }); // Ephemeral
            
            try {
                // 檢查權限 - 只有管理員或特定用戶可以使用
                if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply({
                        content: '❌ 您沒有權限使用此指令',
                        ephemeral: true
                    });
                    return;
                }
                
                // 初始化 pendingInteractions Map（如果不存在）
                if (!client.pendingInteractions) {
                    client.pendingInteractions = new Map();
                }

                // 儲存此次重載請求
                client.pendingReloads.set(interaction.id, commandName);
                client.pendingInteractions.set(interaction.id, interaction);
                
                await interaction.editReply({
                    content: `🔄 正在重新載入 ${commandName === 'all' ? '所有指令' : `指令 ${commandName}`}...`,
                    ephemeral: true
                });
                
                // 觸發重載事件（與 commands/discord/index.js 對接）
                client.emit('dcUnregisterCommand', commandName);
                
                Logger.info(`[Discord] ${interaction.user.tag} 請求重新載入指令: ${commandName}`);
                
            } catch (error) {
                Logger.error('[Discord] 執行 reload 指令時發生錯誤:', error);
                await interaction.editReply({
                    content: `❌ 重新載入失敗: ${error.message}`,
                    ephemeral: true
                }).catch(err => Logger.error('[Discord Reload] 編輯回覆失敗:', err));
            }
        }
    },
    
    init,
    cleanup
};
