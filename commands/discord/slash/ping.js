const { SlashCommandBuilder, MessageFlags } = require('discord.js');

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
        const response = await interaction.reply({
            content: 'Pinging...',
            flags: [MessageFlags.Ephemeral],
            withResponse: true
        });

        const latency = response.resource.message.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const replyContent = {
            'en-US': `Pong! Bot Latency is ${latency}ms. API Latency is ${apiLatency}ms.`,
            'zh-TW': `Pong！機器人延遲為 ${latency}ms，API 延遲為 ${apiLatency}ms。`
        };

        await interaction.editReply({
            content: replyContent[interaction.locale] || replyContent['en-US']
        });
    },
};
