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
const pendingDeposits = new Map()

module.exports = {
    name: 'deposit',
    aliases: ['donate', '存款', '捐錢'],
    description: '把資金給 Bot',
    usage: '/m bot deposit',
    execute,
}

client.on('mcBotDeposit', ({ bot, playerId, amount, type }) => {
    handleDeposit(bot, playerId, amount, type)
})

function handleDeposit(bot, playerId, amount, currency) {
    if (pendingDeposits.has(playerId)) {
        const { timer } = pendingDeposits.get(playerId)
        clearTimeout(timer)
        pendingDeposits.delete(playerId)
        bot.chat(`/m ${playerId} 已收到您存入的 &b${amount} &f個 ${currency}`)
    }
}

async function execute(bot, playerId, args) {
    if (pendingDeposits.has(playerId)) {
        const { timer } = pendingDeposits.get(playerId)
        clearTimeout(timer)
        pendingDeposits.delete(playerId)
        bot.chat(`/m ${playerId} 已取消存款操作`)
        return
    }

    bot.chat(`/m ${playerId} 在接下來的二十秒請將要存入 Bot 內的金額轉給我，&c再次輸入指令&f可取消`)

    // 設置超時計時器
    const timer = setTimeout(() => {
        pendingDeposits.delete(playerId)
        bot.chat(`/m ${playerId} 未在期間內收到存款，如欲放入請再次使用 &e${module.exports.usage.replace('/m bot', '').trim()}`)
    }, 20000)

    // 記錄等待存款的玩家
    pendingDeposits.set(playerId, { timer, startTime: Date.now() })
}