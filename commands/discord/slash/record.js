const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('record')
        .setDescription('Manage betting records')
        .setDescriptionLocalizations({
            'zh-TW': '管理下注記錄'
        }),
    async execute(interaction) {
        await interaction.reply('記錄功能尚未實作');
    },
};
