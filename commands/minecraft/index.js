const fs = require('fs');
const path = require('path');
const Logger = require('../../utils/logger');
const { client } = require('../../core/client');
const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../../services/general/userInfoService');

Logger.debug('Minecraft command handler loaded');

let eventHandlers = [];

function init() {
    const unregisterCommandHandler = async (commandName) => {
        try {
            if (commandName == 'all') {
                // unregister all commands
                for (const cmdName in client.mcCommands) {
                    await unregisterCommand(cmdName);
                }
                await registerCommands();
                client.emit('mcReloadResult', { success: true, commandName, message: '所有指令重新載入成功' });
            } else {
                await unregisterCommand(commandName);
                await registerCommands(commandName);
                client.emit('mcReloadResult', { success: true, commandName, message: `指令 ${commandName} 重新載入成功` });
            }
        } catch (error) {
            Logger.error(`[commands.unregisterCommand] 重新載入指令時發生錯誤:`, error);
            client.emit('mcReloadResult', { success: false, commandName, message: `重新載入失敗: ${error.message}`, error });
        }
    };
    client.on('mcUnregisterCommand', unregisterCommandHandler);
    eventHandlers.push({ event: 'mcUnregisterCommand', listener: unregisterCommandHandler });

    const commandHandler = async ({ bot, playerId, commandName, args }) => {
        await handleCommand({ bot, playerId, commandName, args });
    };
    client.on('mcCommand', commandHandler);
    eventHandlers.push({ event: 'mcCommand', listener: commandHandler });
    registerCommands();
}

function cleanup() {
    // 清理所有已註冊的指令
    for (const cmdName in client.mcCommands) {
        const command = client.mcCommands[cmdName];
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            command.cleanup();
        }
    }
    
    // 清空指令列表
    client.mcCommands = {};
    
    // 移除所有事件監聽器
    for (const handler of eventHandlers) {
        client.removeListener(handler.event, handler.listener);
    }
    eventHandlers = [];
}

async function handleCommand({ bot, playerId, commandName, args }) {
    const command = Object.values(client.mcCommands).find(cmd => cmd.name === commandName || cmd.aliases.includes(commandName));
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

async function registerCommands(commandName='all') {
    // TODO: 也要動態載入 addons 裡面的指令

    if (commandName !== 'all') {
        const commandPath = path.join(__dirname, `${commandName}.js`);
        if (fs.existsSync(commandPath)) {
            const command = require(commandPath);
            if (command && command.name && typeof command.execute === 'function') {
                client.mcCommands[command.name] = command;
                // 如果指令有 init 方法，執行它
                if (typeof command.init === 'function') {
                    command.init();
                }
                Logger.info(`[commands] 指令重新載入成功: ${command.name}`);
            }
        } else {
            Logger.warn(`[commands.registerCommands] 指令檔案不存在: ${commandPath}`);
            throw new Error(`指令檔案 ${commandPath} 不存在`);
        }

    } else {
        const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
        let loadedCount = 0;
        for (const file of commandFiles) {
            const commandPath = path.join(__dirname, file);
            const command = require(commandPath);
            if (command && command.name && typeof command.execute === 'function') {
                client.mcCommands[command.name] = command;
                // 如果指令有 init 方法，執行它
                if (typeof command.init === 'function') {
                    command.init();
                }

                Logger.debug(`[commands] 指令載入成功: ${command.name}`);

                loadedCount++;
            }
        }
        Logger.info(`[commands] 成功載入 ${loadedCount} 個指令`);
    }
}

async function unregisterCommand(commandName) {
    if (client.mcCommands[commandName]) {
        const command = client.mcCommands[commandName];
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            await command.cleanup();
        }
        delete client.mcCommands[commandName];
        try {
            const resolved = require.resolve(path.join(__dirname, `${commandName}.js`));
            delete require.cache[resolved];
        } catch (e) {
            // ignore if can't resolve
        }
    }
}
module.exports = {
    name: 'commandHandler',
    commands: [],
    registerCommands,
    unregisterCommand,
    init,
    cleanup
};