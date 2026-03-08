// wallet
const User = require('../../models/User');

async function execute(bot, command, sender, args) {
    const userEWallet = User.getByPlayerId(sender)?.eWallet || 0;
    const userCWallet = User.getByPlayerId(sender)?.cWallet || 0;

    bot.logger.debug(`${sender} eWallet: ${userEWallet}, cWallet: ${userCWallet}`);

    if (userEWallet > 0) {
        await bot.PayService.pay(sender, userEWallet, 'emerald')
            .then(() => {
                bot.logger.debug(`${sender} 已成功領取 ${userEWallet} 綠寶石`);
                User.updateWallet(sender, { eChange: -userEWallet });
            })
            .catch((err) => {
                bot.chat(`/m ${sender} 領取綠寶石失敗: ${err.error.message}`);
                bot.logger.error(`${sender} 領取綠寶石失敗: ${err.error.message}`);
            });
    }

    if (userCWallet > 0) {
        await bot.PayService.pay(sender, userCWallet, 'coin')
            .then(() => {
                bot.logger.debug(`${sender} 已成功領取 ${userCWallet} 村民錠`);
                User.updateWallet(sender, { cChange: -userCWallet });
            })
            .catch((err) => {
                bot.chat(`/m ${sender} 領取村民錠失敗: ${err.error.message}`);
                bot.logger.error(`${sender} 領取村民錠失敗: ${err.error.message}`);
            });
    }
}

module.exports = {
    name: 'wallet',
    description: '領取錢包內的餘額',
    aliases: ['領錢', '領取'],
    execute
}