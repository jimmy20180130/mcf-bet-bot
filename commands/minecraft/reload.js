// commands/minecraft/reload.js

const { client } = require('../../core/client')
const Logger = require('../../utils/logger');
const { withErrorHandling } = require('../../utils/commandHandler');

// Store pending reloads on mcClient to persist across reloads
// Store pending reloads on client to persist across reloads
if (!client.pendingReloads) {
    client.pendingReloads = new Map();
}

let reloadResultHandler = null;

function init() {
    reloadResultHandler = (result) => {
        const { success, commandName, message, error } = result;

        for (const [playerId, pendingCommand] of client.pendingReloads.entries()) {
            if (pendingCommand === commandName) {
                const bot = client.mcBot;
                if (bot && typeof bot.chat === 'function') {
                    if (success) {
                        bot.chat(`/m ${playerId} &a${message}`);
                    } else {
                        bot.chat(`/m ${playerId} &c${message}`);
                        Logger.error(`[reload] 重新載入失敗:`, error);
                    }
                }
                client.pendingReloads.delete(playerId);
            }
        }
    };
    // listen for minecraft reload results
    client.on('mcReloadResult', reloadResultHandler);
}

function cleanup() {
    if (reloadResultHandler) {
        client.removeListener('mcReloadResult', reloadResultHandler);
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

    client.pendingReloads.set(playerId, commandName);

    client.emit('mcUnregisterCommand', commandName);
}