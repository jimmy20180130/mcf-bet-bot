// [ ] 功能符合需求
// [ ] 邊界條件都有處理
// [ ] 錯誤情況都有測試
// [ ] 遵循命名規範
// [ ] 沒有重複程式碼（DRY原則）
// [ ] 函數單一職責
// [ ] 註解清楚且必要
// [ ] 錯誤訊息清楚明確
// [ ] 使用標準錯誤代碼
// [ ] 錯誤都有記錄日誌
// [ ] 避免不必要的資料庫查詢
// [ ] 獨立任務使用 Promise.all
// [ ] 大量資料有分頁處理
// [ ] 使用者輸入都有驗證
// [ ] 敏感資訊不會記錄
// [ ] 權限檢查完整

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
