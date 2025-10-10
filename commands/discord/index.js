const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../../utils/logger');
const { dcClient } = require('../../core/client');
const toml = require('smol-toml')
// 讀取配置
const configPath = path.join(__dirname, '..', '..', 'config.toml');
const configContent = fs.readFileSync(configPath, 'utf-8');


const config = toml.parse(configContent);

let eventHandlers = [];

async function init(discordClient) {
    // 設置重載指令的事件處理
    const unregisterCommandHandler = async (commandName) => {
        try {
            if (commandName === 'all') {
                // 卸載所有指令
                for (const [cmdName] of dcClient.commands) {
                    await unregisterCommand(cmdName);
                }
                await registerCommands();
                dcClient.emit('reloadResult', { success: true, commandName, message: '所有 Discord 指令重新載入成功' });
            } else {
                await unregisterCommand(commandName);
                await registerCommands(commandName);
                dcClient.emit('reloadResult', { success: true, commandName, message: `Discord 指令 ${commandName} 重新載入成功` });
            }
        } catch (error) {
            Logger.error(`[Discord] 重新載入指令時發生錯誤:`, error);
            dcClient.emit('reloadResult', { success: false, commandName, message: `重新載入失敗: ${error.message}`, error });
        }
    };
    dcClient.on('unregisterDiscordCommand', unregisterCommandHandler);
    eventHandlers.push({ event: 'unregisterDiscordCommand', listener: unregisterCommandHandler });

    await registerCommands();
}

function cleanup() {
    // 清理所有已註冊的指令
    for (const [cmdName, command] of dcClient.commands) {
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            command.cleanup();
        }
    }
    
    // 清空指令列表
    dcClient.commands.clear();
    
    // 移除所有事件監聽器
    for (const handler of eventHandlers) {
        dcClient.removeListener(handler.event, handler.listener);
    }
    eventHandlers = [];
}

async function registerCommands(commandName = 'all') {
    const commands = [];
    
    if (commandName !== 'all') {
        // 只載入指定的指令
        const commandPath = path.join(__dirname, 'slashCommands', `${commandName}.js`);
        if (fs.existsSync(commandPath)) {
            // 清除快取
            delete require.cache[require.resolve(commandPath)];
            
            const command = require(commandPath);
            if (command && command.data && typeof command.execute === 'function') {
                dcClient.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                
                // 如果指令有 init 方法，執行它
                if (typeof command.init === 'function') {
                    command.init();
                }
                
                Logger.info(`[Discord] 指令重新載入成功: ${command.data.name}`);
            }
        } else {
            Logger.warn(`[Discord] 指令檔案不存在: ${commandPath}`);
            throw new Error(`指令檔案 ${commandName}.js 不存在`);
        }
    } else {
        // 載入所有指令
        const commandFiles = fs.readdirSync(path.join(__dirname, 'slashCommands'))
            .filter(file => file.endsWith('.js') && file !== 'index.js');

        let loadedCount = 0;
        for (const file of commandFiles) {
            const commandPath = path.join(__dirname, 'slashCommands', file);
            const command = require(commandPath);
            if (command && command.data && typeof command.execute === 'function') {
                dcClient.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                
                // 如果指令有 init 方法，執行它
                if (typeof command.init === 'function') {
                    command.init();
                }
                
                Logger.debug(`[Discord] 指令載入成功: ${command.data.name}`);
                loadedCount++;
            }
        }
        Logger.info(`[Discord] 成功載入 ${loadedCount} 個指令`);
    }

    // 註冊 slash commands 到 Discord
    const rest = new REST().setToken(config.general.discordBotToken);

    try {
        Logger.debug(`[Discord] 開始註冊 ${commands.length} 個指令`);

        await rest.put(
            Routes.applicationCommands(config.general.discordApplicationID),
            { body: commands }
        );

        Logger.info(`[Discord] 成功註冊 ${commands.length} 個指令到 Discord`);
    } catch (error) {
        Logger.error('[Discord] 註冊 slash commands 時發生錯誤:', error);
    }
}

async function unregisterCommand(commandName) {
    if (dcClient.commands.has(commandName)) {
        const command = dcClient.commands.get(commandName);
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            await command.cleanup();
        }
        dcClient.commands.delete(commandName);
        
        // 清除 require 快取
        const commandPath = path.join(__dirname, 'slashCommands', `${commandName}.js`);
        delete require.cache[require.resolve(commandPath)];
        
        Logger.debug(`[Discord] 指令已卸載: ${commandName}`);
    }
}

module.exports = {
    init,
    cleanup,
    registerCommands,
    unregisterCommand
};
