// commands/minecraft/reload.js

const client = require('../../core/client')
const Logger = require('../../utils/logger');
const { withErrorHandling } = require('../../utils/commandHandler');

const pendingReloads = new Map();

client.on('mcBotReloadResult', (result) => {
    const { success, commandName, message, error } = result;
    
    for (const [playerId, pendingCommand] of pendingReloads.entries()) {
        if (pendingCommand === commandName) {
            const bot = client.mcBotInstance;
            if (bot) {
                if (success) {
                    bot.chat(`/m ${playerId} ${message}`);
                } else {
                    bot.chat(`/m ${playerId} &c${message}`);
                    Logger.error(`[reload] 重新載入失敗:`, error);
                }
            }
            pendingReloads.delete(playerId);
        }
    }
});

module.exports = {
    name: 'reload',
    aliases: ['reload'],
    description: '重新載入指令',
    usage: '/m bot reload <commandName|all>',
    requiredPermissionLevel: 2, // 測試用的
    execute: withErrorHandling(execute),
}

async function execute(bot, playerId, args) {
    if (!args) {
        bot.chat(`/m ${playerId} &c請提供要重新載入的指令名稱，或使用 &eall &c來重新載入所有指令`);
        return;
    }

    const commandName = args.toLowerCase();

    pendingReloads.set(playerId, commandName);
    
    client.emit('mcBotUnregisterCommand', commandName);
}