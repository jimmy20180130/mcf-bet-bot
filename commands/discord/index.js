const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../../utils/logger');
const { client } = require('../../core/client');
const toml = require('smol-toml')
// 讀取配置
const configPath = path.join(__dirname, '..', '..', 'config.toml');
const configContent = fs.readFileSync(configPath, 'utf-8');


const config = toml.parse(configContent);

// Load data config for features
const dataConfigPath = path.join(__dirname, '..', '..', 'data', 'cfg.toml');
let features = [];
try {
    const dataConfigContent = fs.readFileSync(dataConfigPath, 'utf-8');
    const dataConfig = toml.parse(dataConfigContent);
    features = dataConfig.general?.features || [];
} catch (e) {
    Logger.warn('[Discord] 無法讀取 data/cfg.toml:', e);
}

let eventHandlers = [];

async function init() {
    // 設置重載指令的事件處理
    const unregisterCommandHandler = async (commandName) => {
        try {
            if (commandName === 'all') {
                // 卸載所有指令
                for (const [cmdName] of client.dcCommands) {
                    await unregisterCommand(cmdName);
                }
                await registerCommands();
                client.emit('dcReloadResult', { success: true, commandName, message: '所有 Discord 指令重新載入成功' });
            } else {
                await unregisterCommand(commandName);
                await registerCommands(commandName);
                client.emit('dcReloadResult', { success: true, commandName, message: `Discord 指令 ${commandName} 重新載入成功` });
            }
        } catch (error) {
            Logger.error(`[Discord] 重新載入指令時發生錯誤:`, error);
            client.emit('dcReloadResult', { success: false, commandName, message: `重新載入失敗: ${error.message}`, error });
        }
    };
    client.on('dcUnregisterCommand', unregisterCommandHandler);
    eventHandlers.push({ event: 'dcUnregisterCommand', listener: unregisterCommandHandler });

    await registerCommands();
}

function cleanup() {
    // 清理所有已註冊的指令
    for (const [cmdName, command] of client.dcCommands) {
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            command.cleanup();
        }
    }
    
    // 清空指令列表
    client.dcCommands.clear();
    
    // 移除所有事件監聽器
    for (const handler of eventHandlers) {
        client.removeListener(handler.event, handler.listener);
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
                // Check feature flag
                if (command.feature && !features.includes(command.feature)) {
                    Logger.warn(`[Discord] 指令 ${command.data.name} 未啟用 (${command.feature})`);
                    return;
                }

                // 更新/替換指定指令到快取的指令集合
                client.dcCommands.set(command.data.name, command);

                // 如果指令有 init 方法，執行它
                if (typeof command.init === 'function') {
                    try {
                        command.init();
                    } catch (err) {
                        Logger.error(`[Discord] 執行 ${command.data.name} 的 init 時發生錯誤:`, err);
                    }
                }

                Logger.info(`[Discord] 指令重新載入成功: ${command.data.name}`);

                // 使用目前的 client.dcCommands 建立要註冊到 Discord 的完整指令清單，
                // 避免僅註冊單一指令而覆蓋掉其他已註冊的指令。
                for (const [, cmd] of client.dcCommands) {
                    if (cmd && cmd.data && typeof cmd.execute === 'function') {
                        commands.push(cmd.data.toJSON());
                    }
                }
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
            let command;
            try {
                command = require(commandPath);
            } catch (error) {
                Logger.error(`[Discord] 載入指令檔案 ${file} 時發生錯誤:`, error);
                continue;
            }
            if (command && command.data && typeof command.execute === 'function') {
                // Check feature flag
                if (command.feature && !features.includes(command.feature)) {
                    Logger.debug(`[Discord] 跳過未啟用的指令: ${command.data.name}`);
                    continue;
                }

                client.dcCommands.set(command.data.name, command);
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
    if (client.dcCommands.has(commandName)) {
        const command = client.dcCommands.get(commandName);
        // 如果指令有 cleanup 方法，執行它
        if (typeof command.cleanup === 'function') {
            await command.cleanup();
        }
        client.dcCommands.delete(commandName);

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
