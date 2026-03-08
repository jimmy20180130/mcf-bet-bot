// signin

const SignIn = require('../../models/SignIn');
const User = require('../../models/User');
const PlayerStats = require('../../models/PlayerStats');

async function execute(bot, command, sender, args) {
    const botName = bot._client.uuid.replace(/-/g, '').toLowerCase();
    const user = User.getByPlayerId(sender);
    if (!user) {
        bot.logger.error(`找不到玩家 ${sender} 的使用者資料`);
        return;
    }
    const playeruuid = user.playeruuid;

    const hasSignedIn = SignIn.hasSignedInToday(playeruuid, botName);

    if (hasSignedIn) {
        bot.chat(`/m ${sender} 你今天在 ${botName} 已經簽到過了`);
        return;
    }

    const stats = PlayerStats.get(playeruuid, botName);
    const reward = stats.daily ? JSON.parse(stats.daily) : { e: 0, c: 0 };

    if (reward.e === 0 && reward.c === 0) {
        bot.chat(`/m ${sender} 你在此 Bot 沒有簽到獎勵可領取`);
        return;
    }

    const payoutResult = {
        emerald: false,
        coin: false,
        emeraldError: null,
        coinError: null
    };

    if (reward.e > 0) {
        await bot.PayService.pay(sender, reward.e, 'emerald')
            .then(() => {
                payoutResult.emerald = true;
            })
            .catch((err) => {
                payoutResult.emeraldError = err;
                bot.logger.error(`[${botName}] 發放獎勵 ${reward.e} 綠寶石給 ${sender} 失敗: ${err.error.message}`);
            });
    } else {
        payoutResult.emerald = true;
    }

    if (reward.c > 0) {
        await bot.PayService.pay(sender, reward.c, 'coin')
            .then(() => {
                payoutResult.coin = true;
            })
            .catch((err) => {
                payoutResult.coinError = err;
                bot.logger.error(`[${botName}] 發放獎勵 ${reward.c} 村民錠給 ${sender} 失敗: ${err.error.message}`);
            });
    } else {
        payoutResult.coin = true;
    }

    SignIn.record(playeruuid, botName, JSON.stringify({ e: reward.e, c: reward.c }));

    const signInData = SignIn.getSignInData(playeruuid, botName);

    const streakMsg = `連續簽到 ${signInData.streak} 天，共簽到 ${signInData.total} 天`;

    if (payoutResult.emerald && payoutResult.coin) {
        bot.chat(`/m ${sender} 簽到成功！你已${streakMsg}`);
    } else {
        let errorParts = [];
        if (!payoutResult.emerald) errorParts.push(`綠寶石失敗: ${payoutResult.emeraldError.error.message.slice(0, 30)}`);
        if (!payoutResult.coin) errorParts.push(`村民錠失敗: ${payoutResult.coinError.error.message.slice(0, 30)}`);

        bot.chat(`/m ${sender} 你已${streakMsg}，但轉帳出錯: ${errorParts.join('，')}`);
    }
}

module.exports = {
    name: 'signIn',
    description: '簽到',
    aliases: ['daily', '簽到'],
    execute
}