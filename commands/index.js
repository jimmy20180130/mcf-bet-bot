const fs = require('fs');
const Logger = require('../utils/logger');
const client = require('../core/client');
const userRepository = require('../repositories').userRepository;
const userinfoService = require('../services/userInfoService');

client.on('mcBotUnregisterCommand', async (commandName) => {
    try {
        if (commandName == 'all') {
            // unregister all commands
            for (const cmdName in client.commands) {
                await unregisterCommand(cmdName);
            }
            await registerCommands();
            client.emit('mcBotReloadResult', { success: true, commandName, message: '所有指令重新載入成功' });
        } else {
            await unregisterCommand(commandName);
            await registerCommands(commandName);
            client.emit('mcBotReloadResult', { success: true, commandName, message: `指令 ${commandName} 重新載入成功` });
        }
    } catch (error) {
        Logger.error(`[commands.mcBotUnregisterCommand] 重新載入指令時發生錯誤:`, error);
        client.emit('mcBotReloadResult', { success: false, commandName, message: `重新載入失敗: ${error.message}`, error });
    }
});

async function handleCommand({ bot, playerId, commandName, args }) {
    // find the commandName in client.commands include all aliases
    const command = Object.values(client.commands).find(cmd => cmd.name === commandName || cmd.aliases.includes(commandName));
    if (!command) return;
    try {
        // check user perm
        await checkUserPermissions(bot, playerId, command)
        await command.execute(bot, playerId, args);
        // TODO: 紀錄指令執行紀錄
    } catch (error) {
        if (error.message === 'NO_PERMISSION') {
            Logger.warn(`[commands.checkUserPermissions] ${playerId} 嘗試使用無權限指令 ${commandName}`);
            // ignore player
            return
        }

        Logger.error(`[commands.handleCommand] 執行指令時發生錯誤 ${commandName}:`, error);
        bot.chat(`/m ${playerId} &c使用指令 ${commandName} 失敗: ${error.message}`);
    }
}

async function checkUserPermissions(bot, playerId, command) {
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

    // Check user's permission level
    // TODO: read owner name from github
    if (user.additionalInfo.permissionLevel < command.requiredPermissionLevel && playerId != 'Jimmy4Real') {
        throw new Error('NO_PERMISSION');
    }

    return true;
}

client.on('mcBotCommand', handleCommand);

async function registerCommands(commandName='all') {
    // TODO: 也要動態載入 addons 裡面的指令

    if (commandName !== 'all') {
        // 只載入指定的指令
        const commandPath = `../commands/minecraft/${commandName}.js`;
        if (fs.existsSync(`./commands/minecraft/${commandName}.js`)) {
            const command = require(commandPath);
            if (command && command.name && typeof command.execute === 'function') {
                client.commands[command.name] = command;
                Logger.debug(`[commands.registerCommands] 成功註冊指令(內部): ${command.name}`);
            }
        } else {
            Logger.warn(`[commands.registerCommands] 指令檔案不存在: ${commandPath}`);
            throw new Error(`指令檔案 ${commandPath} 不存在`);
        }

    } else {
        const commandFiles = fs.readdirSync('./commands/minecraft').filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/minecraft/${file}`);
            if (command && command.name && typeof command.execute === 'function') {
                client.commands[command.name] = command;
                Logger.debug(`[commands.registerCommands] 成功註冊指令(內部): ${command.name}`);
            }
        }
    }
}

async function unregisterCommand(commandName) {
    if (client.commands[commandName]) {
        delete client.commands[commandName];
        delete require.cache[require.resolve(`../commands/minecraft/${commandName}.js`)];
        Logger.debug(`[commands.unregisterCommand] 成功移除指令(內部): ${commandName}`);
    }
}

module.exports = {
    commands: [],
    registerCommands,
    unregisterCommand,
};