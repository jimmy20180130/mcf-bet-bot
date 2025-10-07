// commands/minecraft/epay.js

const paymentService = require("../../services/minecraft/paymentService");
const { addCommas, removeCommas } = require("../../utils/format");
const { withErrorHandling, validateNumber, validateRequired } = require("../commandHandler");
const { ValidationError } = require("../../utils/errors");
const Logger = require("../../utils/logger");

module.exports = {
    name: 'epay',
    aliases: ['epay', 'emeraldpay', '轉綠'],
    description: '轉帳綠寶石給其他玩家',
    usage: '/m bot epay <player> <amount>',
    requiredPermissionLevel: 1, // admin
    execute: withErrorHandling('epay', execute),   
}

async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        throw new ValidationError(`用法: epay <player> <amount>`);
    }

    const targetPlayer = parts[0];
    const amount = validateNumber(removeCommas(parts[1]), '金額', { min: 1, integer: true });

    // 驗證目標玩家名稱不為空
    validateRequired({ targetPlayer }, ['targetPlayer']);

    Logger.log(`[epay] ${playerId} 轉帳 ${amount} 綠寶石給 ${targetPlayer}`);

    const result = await paymentService.epay(targetPlayer, amount);
    bot.chat(`/m ${playerId} &f成功轉帳 &b${addCommas(result.amount)} &f個&a綠寶石&f給 &b${result.player} &f(餘額: &b${addCommas(result.balance)}&f)`);
}