const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setNameLocalizations({
            'zh-TW': 'ping'
        })
        .setDescription('Replies with Pong!')
        .setDescriptionLocalizations({
            'zh-TW': '查看機器人延遲'
        }),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const replyContent = {
            'en-US': `Pong! Latency is ${latency}ms.`,
            'zh-TW': `Pong！延遲為 ${latency}ms。`
        };
        await interaction.editReply({ content: replyContent[interaction.locale] || replyContent['en-US'] });
    },
};
