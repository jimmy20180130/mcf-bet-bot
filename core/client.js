const EventEmitter = require('events');
const Logger = require('../utils/logger');

// 核心 client，用於共享資料
const client = new EventEmitter();

// Minecraft 專用 client
const mcClient = new EventEmitter();

// Discord 專用 client
const dcClient = new EventEmitter();

// Minecraft 專用資料
mcClient.commands = {};
mcClient.botInstance = null;

// 橋接 mcClient 的事件到 client，使用 'minecraft:' 前綴
function bridgeMinecraftEvents() {
    mcClient.onAny((event, ...args) => {
        client.emit(`minecraft:${event}`, ...args);
    });
}

// 橋接 dcClient 的事件到 client，使用 'discord:' 前綴
function bridgeDiscordEvents() {
    dcClient.onAny((event, ...args) => {
        client.emit(`discord:${event}`, ...args);
    });
}

// 因為 EventEmitter 沒有 onAny，我們需要手動實現事件橋接
// 或者直接在使用時加上前綴

// 清理所有 Minecraft 相關的事件監聽器
function cleanupMinecraftListeners() {
    // 移除 mcClient 的所有監聽器
    mcClient.removeAllListeners();
    
    // 移除 client 上所有 'minecraft:' 前綴的事件監聽器
    const events = client.eventNames();
    for (const event of events) {
        if (typeof event === 'string' && event.startsWith('minecraft:')) {
            client.removeAllListeners(event);
        }
    }
}

// 保存 bot 實例
mcClient.on('spawned', (botInstance) => {
    mcClient.botInstance = botInstance;
});

module.exports = {
    client,
    mcClient,
    dcClient,
    cleanupMinecraftListeners
};