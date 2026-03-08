const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Bot settings')
        .setDescriptionLocalizations({
            'zh-TW': 'Bot 設定'
        }),
    async execute(interaction) {
        await interaction.reply('設定功能尚未實作');
    },
};
