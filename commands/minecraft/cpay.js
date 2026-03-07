// cpay
async function execute(bot, command, sender, args) {
    const [target, amount] = args.split(' ');
    if (!target || !amount) {
        bot.chat(`/m ${sender} ${command} 玩家ID 金額`);
        return;
    }

    await bot.PayService.pay(target, amount, 'coin')
        .then(() => {
            bot.chat(`/m ${sender} 已成功轉帳 ${amount} 村民錠給 ${target}`);
        })
        .catch(err => {
            bot.chat(`/m ${sender} 轉帳失敗: ${err.message}`);
        });
}

module.exports = {
    name: 'cpay',
    description: '轉帳村民錠給其他玩家',
    aliases: [],
    execute
};
