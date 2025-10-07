// commands/minecraft/cpay.js

const paymentService = require("../../services/minecraft/paymentService");
const { addCommas, removeCommas } = require("../../utils/format");
const Logger = require("../../utils/logger");
const { withErrorHandling, validateNumber, validateRequired } = require("../commandHandler");

module.exports = {
    name: 'cpay',
    aliases: ['cpay', 'coinpay', '轉村'],
    description: '轉帳村民錠給其他玩家',
    usage: '/m bot cpay <player> <amount>',
    requiredPermissionLevel: 1, // admin
    execute: withErrorHandling('cpay', execute),   
}

async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        bot.chat(`/m ${playerId} 用法: ${module.exports.usage.replace('/m bot ', '')}`);
        return;
    }

    const targetPlayer = parts[0];
    const amount = validateNumber(parts[1], '金額', { min: 1, integer: true });
    
    // 驗證目標玩家名稱不為空
    validateRequired({ targetPlayer }, ['targetPlayer']);

    Logger.log(`[cpay] ${playerId} 轉帳 ${amount} 村民錠給 ${targetPlayer}`);

    const result = await paymentService.cpay(targetPlayer, amount);
    bot.chat(`/m ${playerId} &f成功轉帳 &b${addCommas(result.amount)} &f個&6村民錠&f給 &b${result.player} &f(餘額: &b${addCommas(result.balance)}&f)`);
}
