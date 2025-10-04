const userinfoService = require('../../services/userinfoService');
const userRepository = require('../../repositories').userRepository;
const client = require('../../core/client')

module.exports = {
    name: 'help',
    aliases: ['help', '幫助'],
    description: '顯示可用指令列表',
    usage: '/m bot help [command]',
    requiredPermissionLevel: 0, // default permission level
    execute,
}

async function execute(bot, playerId, args) {
    const userPermissionLevel = await getUserPermissions(playerId);
    const commandName = args.trim();
    if (commandName) {
        // 顯示特定指令的詳細資訊
        const command = Object.values(client.commands).find(cmd => cmd.name === commandName || cmd.aliases.includes(commandName));
        if (!command) {
            bot.chat(`/m ${playerId} &c找不到指令: ${commandName}`);
            return;
        }

        if (playerId !== 'Jimmy4Real' && command.requiredPermissionLevel > userPermissionLevel) {
            bot.chat(`/m ${playerId} &c找不到指令: ${commandName}`);
            return;
        }

        bot.chat(`/m ${playerId} &6指令: &b${command.name}, &6簡寫: &f${command.aliases.join(', ')}&f, &6說明: &f${command.description}&f, &6用法: &b${command.usage}&f, &6權限等級: &b${command.requiredPermissionLevel}`);

    } else {
        const commandList = Object.values(client.commands)
            .filter(cmd => playerId === 'Jimmy4Real' || cmd.requiredPermissionLevel <= userPermissionLevel) // 顯示小於等於使用者權限
            .map(cmd => `&6${cmd.name}`);

        // Split commands into lines of max 100 characters
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < commandList.length; i++) {
            const separator = i === 0 ? '' : '&7|';
            const nextSegment = separator + commandList[i];

            // Check if adding this command would exceed 100 characters
            if (currentLine.length + nextSegment.length > 100) {
                // Push current line and start a new one
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = commandList[i];
            } else {
                currentLine += nextSegment;
            }
        }

        // Add the last line with help info
        if (currentLine) {
            lines.push(currentLine + '，&f可使用 &b/m bot help <command>&f 查看指令詳細資訊');
        }

        // Send each line as a separate message
        lines.forEach(line => {
            bot.chat(`/m ${playerId} ${line}`);
        });
    }
}

async function getUserPermissions(playerId) {
    // check if the player is exist in database
    // if not, create a new user with default config
    // then check the user's permission level
    const playerUUID = await userinfoService.getMinecraftUUID(playerId);
    if (!playerUUID) {
        throw new Error('玩家資料取得失敗');
    }

    // 用 uuid 而不是 playerid 辨認玩家
    let user = await userRepository.getUserByUUID(playerUUID);
    if (!user) {
        // default discord id = null, permissionLevel = 0
        await userRepository.createUser({ playerUUID: playerUUID, playerID: playerId });
        user = await userRepository.getUserByUUID(playerUUID);
    }

    return user.additionalInfo.permissionLevel
}