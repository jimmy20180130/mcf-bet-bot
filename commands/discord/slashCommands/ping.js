const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setNameLocalizations({
            'zh-TW': '延遲',
            'en-US': 'ping'
        })
        .setDescription('顯示機器人的延遲資訊'),
    
    async execute(interaction) {
        try {
            const start = Date.now();
            await interaction.reply({ content: '🏓 測試中...', flags: [MessageFlags.Ephemeral] });
            
            // 計算回覆延遲
            const replyLatency = Date.now() - start;
            
            // 獲取 WebSocket 延遲
            const wsLatency = interaction.client.ws.ping;
            
            // 創建嵌入訊息
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: '📡 API 延遲', value: `${replyLatency}ms`, inline: true },
                    { name: '💓 WebSocket 延遲', value: `${wsLatency}ms`, inline: true }
                )
                .setFooter({
                    text: "Jimmy Bot",
                    iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
                })
                .setTimestamp();
            
            // 更新回覆
            await interaction.editReply({
                content: null,
                embeds: [embed]
            });
            
            Logger.info(`[Discord] Ping command executed - API: ${replyLatency}ms, WS: ${wsLatency}ms`);
        } catch (error) {
            Logger.error('[Discord] 執行 ping 指令時發生錯誤:', error);
            
            const errorMessage = '❌ 執行 ping 指令時發生錯誤';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage, embeds: [] });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};