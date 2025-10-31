const { client } = require('./client');
const { Client, Events, GatewayIntentBits, ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const toml = require('smol-toml')
// 讀取配置
const configPath = path.join(__dirname, '..', 'config.toml');
const configContent = fs.readFileSync(configPath, 'utf-8');

const config = toml.parse(configContent);

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

let eventHandlers = [];

async function init() {
    // 載入 Discord 指令
    const discordCommands = require('../commands/discord');
    await discordCommands.init(discordClient);

    // Ready 事件
    const readyHandler = async (readyClient) => {
        Logger.info(`[Discord] 成功以 ${readyClient.user.tag} 登入`);
        
        // 設置 presence
        readyClient.user.setPresence({
            activities: [{
                name: 'Jimmy Bot',
                type: ActivityType.Playing
            }],
            status: 'online'
        });
        
        // 發送 ready 事件到 client
        client.emit('dcReady', readyClient);
    };
    
    discordClient.once(Events.ClientReady, readyHandler);
    eventHandlers.push({ event: Events.ClientReady, listener: readyHandler, once: true });

    // Interaction 事件處理
    const interactionHandler = async (interaction) => {
        // 處理自動完成
        if (interaction.isAutocomplete()) {
            const command = client.dcCommands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                Logger.error(`[Discord] 處理自動完成 ${interaction.commandName} 時發生錯誤:`, error);
            }
            return;
        }

        // 處理指令執行
        if (!interaction.isChatInputCommand()) return;

        const command = client.dcCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            Logger.error(`[Discord] 執行指令 ${interaction.commandName} 時發生錯誤:`, error);
            
            const errorMessage = { content: '執行指令時發生錯誤', ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    };
    discordClient.on(Events.InteractionCreate, interactionHandler);
    eventHandlers.push({ event: Events.InteractionCreate, listener: interactionHandler });

    // 登入
    await discordClient.login(config.general.discordBotToken);
}

function cleanup() {
    // 清理所有事件監聽器
    for (const handler of eventHandlers) {
        if (handler.once) {
            discordClient.removeListener(handler.event, handler.listener);
        } else {
            discordClient.removeListener(handler.event, handler.listener);
        }
    }
    eventHandlers = [];

    // 清空指令列表
    client.dcCommands.clear();

    // 登出
    if (discordClient.isReady()) {
        discordClient.destroy();
    }
}

module.exports = {
    discordClient,
    init,
    cleanup
};