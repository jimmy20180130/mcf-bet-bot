// link
const { createLinkCode } = require('../../services/linkService');
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    const code = createLinkCode(sender);

    if (!code) {
        bot.sendMsg(t('mc.link.alreadyLinked', { sender }));
        return;

    } else {
        bot.sendMsg(t('mc.link.getCode', { sender, code }));
    }
}

module.exports = {
    name: 'link',
    description: '綁定 Discord 帳號',
    aliases: ['綁定'],
    execute
}