const { withErrorHandling } = require("../../utils/commandHandler");

module.exports = {
    name: 'example',
    aliases: [],
    description: '這是一個範例指令',
    usage: '<args>',
    requiredPermissionLevel: 0, // default permission level
    execute: withErrorHandling(execute),
}

async function execute(bot, playerId, args) {
    // 在這裡實現指令的邏輯
    bot.chat(`Hello, ${playerId}! You executed the example command with args: ${args}`);
}