const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check user ranking')
        .setDescriptionLocalizations({
            'zh-TW': '查詢排行榜'
        }),
    async execute(interaction) {
        await interaction.reply('排行榜功能尚未實作');
    },
};
