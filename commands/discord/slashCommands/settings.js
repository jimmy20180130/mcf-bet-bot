const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { userRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('查看或修改個人設定'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator') && interaction.user.id !== '1256550027040657409') {
            await interaction.reply({
                content: '❌ 執行失敗: 無權限使用此指令',
                ephemeral: true
            });
            return;
        }
    }
};