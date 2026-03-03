const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Logger = require('../../../utils/logger');

module.exports = {
    feature: 'commands.discord.slashCommands.example',
    data: new SlashCommandBuilder()
        .setName('example')
        .setNameLocalizations({
            'zh-TW': '範例指令'
        })
        .setDescription('Example command')
        .setDescriptionLocalizations({
            'zh-TW': '範例指令說明'
        }),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // 你的指令邏輯
            await interaction.editReply({ content: '成功！' });
        } catch (error) {
            Logger.error('[Discord] 執行指令時發生錯誤:', error);
            await interaction.editReply({
                content: '❌ 執行指令時發生錯誤'
            });
        }
    }
};