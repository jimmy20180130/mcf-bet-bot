// wallet
const User = require('../../models/User');
const PlayerStats = require('../../models/PlayerStats');

async function execute(bot, command, sender, args) {
    const user = User.getByPlayerId(sender);
    
    if (!user) {
        bot.logger.error(`找不到玩家 ${sender} 的使用者資料`);
        return;
    }

    const botName = bot._client.uuid.replace(/-/g, '').toLowerCase();
    const stats = PlayerStats.get(user.playeruuid, botName);

    if (!stats) {
        bot.chat(`/m ${sender} 你的錢包目前沒有可領取的餘額`);
        return;
    }

    const userEWallet = stats.emerald || 0;
    const userCWallet = stats.coin || 0;

    bot.logger.debug(`${sender} 在 ${botName} 的 eWallet: ${userEWallet}, cWallet: ${userCWallet}`);

    if (userEWallet > 0) {
        await bot.PayService.pay(sender, userEWallet, 'emerald')
            .then(() => {
                bot.logger.debug(`${sender} 已成功領取 ${userEWallet} 綠寶石`);
                PlayerStats.updateWallet(user.playeruuid, botName, { eChange: -userEWallet });
            })
            .catch((err) => {
                const errorMsg = err.error?.message || '未知錯誤';
                bot.chat(`/m ${sender} 領取綠寶石失敗: ${errorMsg}`);
                bot.logger.error(`${sender} 領取綠寶石失敗: ${errorMsg}`);
            });
    }

    if (userCWallet > 0) {
        await bot.PayService.pay(sender, userCWallet, 'coin')
            .then(() => {
                bot.logger.debug(`${sender} 已成功領取 ${userCWallet} 村民錠`);
                PlayerStats.updateWallet(user.playeruuid, botName, { cChange: -userCWallet });
            })
            .catch((err) => {
                const errorMsg = err.error?.message || '未知錯誤';
                bot.chat(`/m ${sender} 領取村民錠失敗: ${errorMsg}`);
                bot.logger.error(`${sender} 領取村民錠失敗: ${errorMsg}`);
            });
    }

    if (userEWallet <= 0 && userCWallet <= 0) {
        bot.chat(`/m ${sender} 你的錢包目前沒有可領取的餘額。`);
    }
}

module.exports = {
    name: 'wallet',
    description: '領取錢包內的餘額',
    aliases: ['領錢', '領取'],
    execute
}