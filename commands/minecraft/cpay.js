// commands/minecraft/cpay.js

const paymentService = require("../../services/paymentService");
const { addCommas, removeCommas } = require("../../utils/format");

module.exports = {
    name: 'cpay',
    aliases: ['cpay', 'coinpay', '轉村'],
    description: '轉帳村民錠給其他玩家',
    usage: '/m bot cpay <player> <amount>',
    requiredPermissionLevel: 1, // admin
    execute,   
}

async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        bot.chat(`/m ${playerId} 用法: ${module.exports.usage.replace('/m bot ', '')}`);
        return;
    }

    const targetPlayer = parts[0];
    const amount = parseInt(parts[1]);

    if (isNaN(amount) || amount <= 0) {
        bot.chat(`/m ${playerId} &c錯誤: 金額必須為正整數`);
        return;
    }

    try {
        const result = await paymentService.cpay(targetPlayer, amount);
        bot.chat(`/m ${playerId} &f成功轉帳 &b${addCommas(result.amount)} &f個&6村民錠&f給 &b${result.player} &f(餘額: &b${addCommas(result.balance)}&f)`);
    } catch (error) {
        bot.chat(`/m ${playerId} &c轉帳失敗: ${error.message}`);
    }
}
