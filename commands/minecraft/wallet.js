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

const userRepository = require('../../repositories/index').userRepository;
const userInfoService = require('../../services/userInfoService');
const paymentService = require('../../services/paymentService');

module.exports = {
    name: 'wallet',
    aliases: ['wallet', '錢包'],
    description: '領取錢包內的餘額',
    usage: '/m bot wallet',
    requiredPermissionLevel: 0, // default
    execute,
}
// TODO: 把 ai 寫出來的垃圾清理乾淨
// TODO: 存取錢包內的錢然後領出來，就這樣就好了
async function execute(bot, playerId, args) {
    let playerUUID;
    
    try {
        playerUUID = await userInfoService.getMinecraftUUID(playerId);
    } catch (error) {
        bot.chat(`/m ${playerId} &c玩家資料取得失敗，請稍後再試`);
        return;
    }

    // step 1: 取得錢包餘額
    // step 2: 如果餘額大於 0，則嘗試領取
    // step 3: clear wallet
    // step 4: pay player
    let user = await userRepository.getUserByUUID(playerUUID);
    if (!user) {
        await userRepository.createUser({
            playerUUID: playerUUID,
            playerID: playerId,
        });

        user = await userRepository.getUserByUUID(playerUUID);
    }

    const wallet = { emerald: user.eWallet, coin: user.cWallet };

    // clear wallet
    await userRepository.updateWallet(playerUUID, 'eWallet', 0);
    await userRepository.updateWallet(playerUUID, 'cWallet', 0);

    let errMsg = { emerald: null, coin: null };

    if (wallet.emerald > 0) {
        await paymentService.epay(playerId, wallet.emerald)
            .catch(err => {
                errMsg.emerald = err.message;
            });
    }

    if (wallet.coin > 0) {
        await paymentService.cpay(playerId, wallet.coin)
            .catch(err => {
                errMsg.coin = err.message;
            });
    }

    if (errMsg.emerald !== null || errMsg.coin !== null) {
        let failMsgs = [];
        if (errMsg.emerald !== null) {
            if (errMsg.emerald === '轉帳超時') {
                failMsgs.push(`${wallet.emerald} 個綠寶石領取失敗 (轉帳超時)，請至 Discord 問題回報區回報`);
            } else {
                failMsgs.push(`${wallet.emerald} 個綠寶石已重新加入至錢包: ${errMsg.emerald}`);
            }
        }
        if (errMsg.coin !== null) {
            if (errMsg.coin === '轉帳超時') {
                failMsgs.push(`${wallet.coin} 個村民錠領取失敗 (轉帳超時)，請至 Discord 問題回報區回報`);
            } else {
                failMsgs.push(`${wallet.coin} 個村民錠已重新加入至錢包: ${errMsg.coin}`);
            }
        }
        bot.chat(`/m ${playerId} &c${failMsgs.join('，')}`);
    } else if (wallet.emerald > 0 || wallet.coin > 0) {
        let msg = `/m ${playerId} 成功領取錢包內的餘額: `;
        if (wallet.emerald > 0) msg += ` &a綠寶石 &b${wallet.emerald}&f`;
        if (wallet.coin > 0) msg += `${wallet.emerald > 0 ? '，' : ''}&6村民錠 &b${wallet.coin}`;
        bot.chat(msg);
    }
}