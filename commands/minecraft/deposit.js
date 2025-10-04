// commands/minecraft/deposit.js

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