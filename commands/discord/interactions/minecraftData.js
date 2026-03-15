const { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../../../models/User');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('minecraftData')
		.setNameLocalizations({
			'zh-TW': '查詢 Minecraft 資料'
		})
		.setType(ApplicationCommandType.User),
        
	name: 'minecraftData',
    
	async execute(interaction) {
		const targetUser = interaction.targetUser;
		const userData = User.getByDiscordId(targetUser.id);

		if (!userData) {
			await interaction.reply({
				content: `使用者 <@${targetUser.id}> 尚未綁定 Minecraft 帳號。`,
				flags: [MessageFlags.Ephemeral]
			});
			return;
		}

		await interaction.reply({
			content: [
				`使用者: <@${targetUser.id}>`,
				`Minecraft ID: ${userData.playerid}`,
				`UUID: ${userData.playeruuid}`
			].join('\n'),
			flags: [MessageFlags.Ephemeral]
		});
	},
};
