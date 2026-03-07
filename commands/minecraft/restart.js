// stop
async function execute(bot, command, sender, args) {
    bot.chat(`/m ${sender} Bot 將在五秒後重新啟動...`);
    setTimeout(() => {
        bot.end('restart');
    }, 5000);
}

module.exports = {
    name: 'restart',
    description: '重新啟動 Bot',
    aliases: ['reload', '重新啟動'],
    execute
}