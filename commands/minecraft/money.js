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

const { addCommas } = require('../../utils/format');

module.exports = {
    name: 'money',
    aliases: [],
    description: '查看目前 Bot 的餘額',
    usage: '/m bot money',
    requiredPermissionLevel: 1, // admin
    execute,   
}

async function execute(bot, playerId, args) {
    const map = bot.scoreboards?.["TAB-Scoreboard"]?.itemsMap;

    let emeraldRaw = map?.["§2§r"]?.displayName?.text?.match(/＄.*?([\d,]+)元/)?.[1];
    let emerald = emeraldRaw ? addCommas(parseInt(emeraldRaw.replace(/,/g, ""))) : "無法取得";

    let villagerRaw = map?.["§3§r"]?.displayName?.text?.match(/§f([\d,]+)個/)?.[1];
    let villager = villagerRaw ? addCommas(parseInt(villagerRaw.replace(/,/g, ""))) : "無法取得";

    bot.chat(`/m ${playerId} &a&l綠寶石&r&7: &b${emerald} &f個，&6&l村民錠&r&7: &b${villager} &f個`);
}