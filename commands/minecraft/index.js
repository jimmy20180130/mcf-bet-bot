const PayService = require('../../services/payService');

async function executeCommand(bot, sender, command, args) {
    switch (command.toLowerCase()) {
        case 'epay':
            const [target, amount] = args.split(' ');
            if (!target || !amount) {
                bot.chat(`/msg ${sender} 指令格式錯誤! 正確格式: /pay 玩家ID 金額`);
                return;
            }
            await new PayService(bot).pay(target, amount, 'emerald')
                .then(() => {
                    bot.chat(`/msg ${sender} 已成功轉帳 ${amount} 綠寶石 給 ${target}`);
                })
                .catch(err => {
                    bot.chat(`/msg ${sender} 轉帳失敗: ${err.message}`);
                });
    }
}

module.exports = {
    executeCommand
};