// deposit
async function execute(bot, command, sender, args) {
    //bot.depositMode = [{playerid: sender, expiresAt: Date.now() + 20000}];
    if (bot.depositMode.find(m => m.playerid === sender)) {
        bot.depositMode = bot.depositMode.filter(m => m.playerid !== sender);
        bot.chat(`/m ${sender} 已取消存放模式`);
        bot.logger.debug(`${sender} exited deposit mode`);
        return;
    }

    bot.depositMode.push({ playerid: sender, expiresAt: Date.now() + 20 * 1000 });

    bot.chat(`/m ${sender} 請在 20 秒內將欲存放之資金轉給我，再次輸入指令可取消存放模式`);
    bot.logger.debug(`${sender} entered deposit mode`);
}

module.exports = {
    name: 'deposit',
    description: '存放資金到 Bot',
    aliases: ['dep', 'donate', '放入', '存入'],
    execute
}