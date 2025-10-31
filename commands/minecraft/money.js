// commands/minecraft/money.js

const { addCommas } = require('../../utils/format');
const { withErrorHandling } = require('../../utils/commandHandler');
const Logger = require('../../utils/logger');

module.exports = {
    name: 'money',
    aliases: [],
    description: '查看目前 Bot 的餘額',
    usage: '/m bot money',
    requiredPermissionLevel: 1, // admin
    execute: withErrorHandling('money', execute),   
}

async function execute(bot, playerId, args) {
    Logger.log(`[money] ${playerId} 查詢 BOT 的餘額`);

    const map = bot.scoreboards?.["TAB-Scoreboard"]?.itemsMap;

    let emeraldRaw = map?.["§2§r"]?.displayName?.text?.match(/＄.*?([\d,]+)元/)?.[1];
    let emerald = emeraldRaw ? addCommas(parseInt(emeraldRaw.replace(/,/g, ""))) : "無法取得";

    let villagerRaw = map?.["§3§r"]?.displayName?.text?.match(/§f([\d,]+)個/)?.[1];
    let villager = villagerRaw ? addCommas(parseInt(villagerRaw.replace(/,/g, ""))) : "無法取得";

    bot.chat(`/m ${playerId} &a&l綠寶石&r&7: &b${emerald} &f個，&6&l村民錠&r&7: &b${villager} &f個`);
}