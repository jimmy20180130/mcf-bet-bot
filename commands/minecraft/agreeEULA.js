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

const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../../services/userInfoService');
const blacklistService = require('../../services/blacklistService');

module.exports = {
    name: 'agreeEULA',
    aliases: ['同意條款', 'acceptEULA', 'agreeEULA', '同意EULA'],
    description: '這是一個範例指令',
    usage: '/m bot agreeEULA',
    requiredPermissionLevel: 0, // default permission level
    execute,   
}

async function execute(bot, playerId, args) {
    let playerUUID
    try {
        playerUUID = await userinfoService.getMinecraftUUID(playerId);
    } catch (error) {
        bot.chat(`/m ${playerId} &c無法取得玩家資訊，請稍後再試`);
        return;
    }

    let user = await userRepository.getUserByUUID(playerUUID);
    if (!user) {
        await userRepository.createUser({ playerUUID: playerUUID, playerID: playerId, additionalInfo: { acceptEULA: true } });
        user = await userRepository.getUserByUUID(playerUUID);
    }

    let userAcceptEULA = user.additionalInfo?.acceptEULA;
    if (userAcceptEULA === true) return;
    
    await blacklistService.updateBlacklistInfo(playerId, { notified: false, eula: true });

    bot.chat(`/m ${playerId} &6您已同意 EULA 條款，現在可以正常使用本機器人`);
}