// stop
async function execute(bot, command, sender, args) {
    bot.chat(`/m ${sender} Bot 將在五秒後關閉...`);
    setTimeout(() => {
        bot.end('stop');
    }, 5000);
}

module.exports = {
    name: 'stop',
    description: '停止 Bot',
    aliases: ['reload', '停止'],
    execute
}