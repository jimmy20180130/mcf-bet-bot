// epay
const { t } = require('../../utils/i18n');

async function execute(bot, command, sender, args) {
    const [target, amount] = args.split(' ');
    if (!target || !amount) {
        bot.chat(t('mc.epay.usage', { sender, command }));
        return;
    }

    await bot.PayService.pay(target, amount, 'emerald')
        .then(() => {
            bot.chat(t('mc.epay.success', { sender, amount, target }));
        })
        .catch(err => {
            bot.chat(t('mc.epay.failed', { sender, error: err.message }));
        });
}

module.exports = {
    name: 'epay',
    description: '轉帳綠寶石給其他玩家',
    aliases: ['pay'],
    requireAdmin: true,
    execute
};
