// epay
async function execute(bot, command, sender, args) {
    const [target, amount] = args.split(' ');
    if (!target || !amount) {
        bot.chat(`/m ${sender} ${command} 玩家ID 金額`);
        return;
    }

    await bot.PayService.pay(target, amount, 'emerald')
        .then(() => {
            bot.chat(`/msg ${sender} 已成功轉帳 ${amount} 綠寶石給 ${target}`);
        })
        .catch(err => {
            bot.chat(`/msg ${sender} 轉帳失敗: ${err.message}`);
        });
}

module.exports = {
    name: 'epay',
    description: '轉帳綠寶石給其他玩家',
    aliases: ['pay'],
    execute
};
