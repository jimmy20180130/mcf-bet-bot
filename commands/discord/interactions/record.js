module.exports = {
    name: 'record',
    async execute(interaction) {
        // 這裡處理來自 record 相關的互動（按鈕、選單等）
        // 假設 customId 格式為 "record_action_..."
        await interaction.reply({ content: '已收到記錄互動請求', ephemeral: true });
    },
};
