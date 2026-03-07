// money
async function execute(bot, command, sender, args) {
    const map = bot.scoreboards?.["TAB-Scoreboard"]?.itemsMap;

    let emeraldRaw = map?.["§2§r"]?.displayName?.text?.match(/＄.*?([\d,]+)元/)?.[1];
    let emerald = emeraldRaw ? addCommas(parseInt(emeraldRaw.replace(/,/g, ""))) : "無法取得";

    let coinRaw = map?.["§3§r"]?.displayName?.text?.match(/§f([\d,]+)個/)?.[1];
    let coin = coinRaw ? addCommas(parseInt(coinRaw.replace(/,/g, ""))) : "無法取得";

    bot.chat(`/m ${sender} &a&l綠寶石&r&7: &b${emerald} &f個，&6&l村民錠&r&7: &b${coin} &f個`);
    bot.logger.debug(`${sender} query money: ${emerald} emeralds, ${coin} coins`);
}

module.exports = {
    name: 'money',
    description: '查看目前 Bot 的餘額',
    aliases: [],
    execute
}