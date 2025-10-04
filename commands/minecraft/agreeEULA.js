// commands/minecraft/agreeEULA.js

const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../../services/userInfoService');
const blacklistService = require('../../services/blacklistService');
const { withErrorHandling } = require('../../utils/commandHandler');

module.exports = {
    name: 'agreeEULA',
    aliases: ['同意條款', 'acceptEULA', 'agreeEULA', '同意EULA'],
    description: '這是一個範例指令',
    usage: '/m bot agreeEULA',
    requiredPermissionLevel: 0, // default permission level
    execute: withErrorHandling(execute),   
}

async function execute(bot, playerId, args) {
    const playerUUID = await userinfoService.getMinecraftUUID(playerId);

    let user = await userRepository.getUserByUUID(playerUUID);
    if (!user) {
        await userRepository.createUser({ playerUUID: playerUUID, playerID: playerId, additionalInfo: { acceptEULA: true } });
        user = await userRepository.getUserByUUID(playerUUID);
    }

    let userAcceptEULA = user.additionalInfo?.acceptEULA;
    if (userAcceptEULA === true) return;
    
    await blacklistService.updateBlacklistInfo(playerId, { notified: false, eula: true });

    bot.chat(`/m ${playerId} &6您已同意 EULA 條款，現在可以正常使用本機器人`);
}