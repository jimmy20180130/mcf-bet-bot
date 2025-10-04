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

const client = require('../../core/client')
const Logger = require('../../utils/logger');

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
    execute,
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