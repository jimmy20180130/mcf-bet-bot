// signIn
const SignIn = require('../../models/SignIn');
const User = require('../../models/User');

async function execute(bot, command, sender, args) {
    const playeruuid = User.getByPlayerId(sender).playeruuid
    const hasSignedIn = SignIn.hasSignedInToday(playeruuid);

    if (hasSignedIn) {
        bot.chat(`/m ${sender} 你今天已經簽到過了`);
        return;
    }

    const rankData = User.getRankSettings(playeruuid);
    const reward = rankData.daily || { e: 0, c: 0 };

    if (reward.e === 0 && reward.c === 0) {
        bot.chat(`/m ${sender} 你沒有簽到獎勵可領取`);
        return;
    }

    const payoutResult = {
        emerald: false,
        coin: false,
        emeraldError: null,
        coinError: null
    }

    if (reward.e > 0) {
        await bot.PayService.pay(sender, reward.e, 'emerald')
            .then(() => {
                payoutResult.emerald = true;
            })
            .catch((err) => {
                payoutResult.emeraldError = err;
                bot.logger.error(`發放簽到獎勵 ${reward.e} 綠寶石給 ${sender} 失敗: ${err.error.message}`);
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
                bot.logger.error(`發放簽到獎勵 ${reward.c} 村民錠給 ${sender} 失敗: ${err.error.message}`);
            });
    } else {
        payoutResult.coin = true;
    }

    SignIn.record(playeruuid, JSON.stringify({ e: reward.e, c: reward.c }));
    const signInData = SignIn.getSignInData(playeruuid);

    if (payoutResult.emerald && payoutResult.coin) {
        bot.chat(`/m ${sender} 簽到成功！你已連續簽到 ${signInData.streak} 天，共簽到 ${signInData.total} 天`);
        
    } else if (!payoutResult.emerald || !payoutResult.coin) {
        if (payoutResult.emerald && !payoutResult.coin) {
            bot.chat(`/m ${sender} 你已連續簽到 ${signInData.streak} 天，共簽到 ${signInData.total} 天，村民錠轉帳失敗: ${payoutResult.coinError.error.message.slice(0, 50)}`);
        } else if (!payoutResult.emerald && payoutResult.coin) {
            bot.chat(`/m ${sender} 你已連續簽到 ${signInData.streak} 天，共簽到 ${signInData.total} 天，綠寶石轉帳失敗: ${payoutResult.emeraldError.error.message.slice(0, 50)}`);
        } else {
            bot.chat(`/m ${sender} 你已連續簽到 ${signInData.streak} 天，共簽到 ${signInData.total} 天，綠寶石轉帳失敗: ${payoutResult.emeraldError.error.message.slice(0, 50)}，村民錠轉帳失敗: ${payoutResult.coinError.error.message.slice(0, 50)}`);
        }
    }
}

module.exports = {
    name: 'signIn',
    description: '簽到',
    aliases: ['daily', '簽到'],
    execute
}