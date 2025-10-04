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

const Logger = require("../../utils/logger");
const paymentService = require("../../services/paymentService");
const { addCommas, removeCommas } = require("../../utils/format");
const { withErrorHandling, validateNumber } = require("../../utils/commandHandler");
const { ValidationError } = require("../../utils/errors");

module.exports = {
    name: 'epay',
    aliases: ['epay', 'emeraldpay', '轉綠'],
    description: '轉帳綠寶石給其他玩家',
    usage: '/m bot epay <player> <amount>',
    requiredPermissionLevel: 1, // admin
    execute: withErrorHandling(execute),   
}

async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        throw new ValidationError(`用法: epay <player> <amount>`);
    }

    const targetPlayer = parts[0];
    const amount = validateNumber(removeCommas(parts[1]), '金額', { min: 1, integer: true });

    if (!targetPlayer || targetPlayer === bot.username) {
        throw new ValidationError('目標玩家名稱無效', 'targetPlayer');
    }

    const result = await paymentService.epay(targetPlayer, amount);
    bot.chat(`/m ${playerId} &f成功轉帳 &b${addCommas(result.amount)} &f個&a綠寶石&f給 &b${result.player} &f(餘額: &b${addCommas(result.balance)}&f)`);
}