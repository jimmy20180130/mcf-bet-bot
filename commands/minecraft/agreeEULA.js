// commands/minecraft/agreeEULA.js

const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../../services/userInfoService');
const blacklistService = require('../../services/blacklistService');

module.exports = {
    name: 'agreeEULA',
    aliases: ['同意條款', 'acceptEULA', 'agreeEULA', '同意EULA'],
    description: '這是一個範例指令',
    usage: '/m bot agreeEULA',
    requiredPermissionLevel: 0, // default permission level
    execute,   
}

async function execute(bot, playerId, args) {
    let playerUUID
    try {
        playerUUID = await userinfoService.getMinecraftUUID(playerId);
    } catch (error) {
        bot.chat(`/m ${playerId} &c無法取得玩家資訊，請稍後再試`);
        return;
    }

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