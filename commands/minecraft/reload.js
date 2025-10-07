// commands/minecraft/reload.js

const { client, mcClient } = require('../../core/client')
const Logger = require('../../utils/logger');
const { withErrorHandling } = require('../commandHandler');

// Store pending reloads on mcClient to persist across reloads
if (!mcClient.pendingReloads) {
    mcClient.pendingReloads = new Map();
}

let reloadResultHandler = null;

function init() {
    reloadResultHandler = (result) => {
        const { success, commandName, message, error } = result;
        
        for (const [playerId, pendingCommand] of mcClient.pendingReloads.entries()) {
            if (pendingCommand === commandName) {
                const bot = mcClient.botInstance;
                if (bot) {
                    if (success) {
                        bot.chat(`/m ${playerId} &a${message}`);
                    } else {
                        bot.chat(`/m ${playerId} &c${message}`);
                        Logger.error(`[reload] 重新載入失敗:`, error);
                    }
                }
                mcClient.pendingReloads.delete(playerId);
            }
        }
    };
    mcClient.on('reloadResult', reloadResultHandler);
}

function cleanup() {
    if (reloadResultHandler) {
        mcClient.removeListener('reloadResult', reloadResultHandler);
        reloadResultHandler = null;
    }
    // Don't clear pendingReloads during cleanup - they need to persist across reloads
}

module.exports = {
    name: 'reload',
    aliases: ['reload'],
    description: '重新載入指令',
    usage: '/m bot reload <commandName|all>',
    requiredPermissionLevel: 2, // 測試用的
    execute: withErrorHandling('reload', execute),
    init,
    cleanup
}

async function execute(bot, playerId, args) {
    if (!args) {
        bot.chat(`/m ${playerId} &c請提供要重新載入的指令名稱，或使用 &eall &c來重新載入所有指令`);
        return;
    }

    const commandName = args.toLowerCase();

    mcClient.pendingReloads.set(playerId, commandName);
    
    mcClient.emit('unregisterCommand', commandName);
}