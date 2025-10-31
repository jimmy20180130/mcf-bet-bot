// TODO: implement online link
// TODO: implement local link

// if can't connect to server then do local link
const { withErrorHandling } = require("../../utils/commandHandler");
const Logger = require('../../utils/logger');
const linkService = require('../../services/general/linkService');

module.exports = {
    name: 'link',
    aliases: [],
    description: '綁定 Minecraft 帳號與 Discord 帳號',
    usage: '/m bot link',
    requiredPermissionLevel: 0, // default permission level
    execute: withErrorHandling('link', execute),
}

async function execute(bot, playerId, args) {
    const verifyCode = linkService.addCode(playerId);
    // TODO: customize message
    bot.chat(`/m ${playerId} 您的驗證碼為 &7[&a${verifyCode}&7]&f，請至 &9D&9iscord 伺服器&f使用 &6&l/綁定 ${verifyCode} &f完成綁定，代碼&c&l5分鐘內失效`);
}