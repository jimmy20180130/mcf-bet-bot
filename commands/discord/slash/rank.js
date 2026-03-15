const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { tForInteraction } = require('../../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check user ranking')
        .setDescriptionLocalizations({
            'zh-TW': '查詢排行榜'
        }),
    async execute(interaction) {
        await interaction.reply(tForInteraction(interaction, 'dc.rank.notImplemented'));
    },
};
