const Logger = require("../utils/logger");
const fs = require('fs');
const { mcClient } = require('./client');
const serviceManager = require('../services/serviceManager');
const mcBot = require('./mcBot')
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const bot = new mcBot({
    username: 'saraun',
    host: 'proxy-net-5.mcfallout.net',
    port: 25565,
    auth: 'microsoft',
    version: '1.20.1'
})

// 註冊所有服務
function registerServices() {
    // Minecraft 專屬服務
    serviceManager.register({ name: 'paymentService', path: '../services/minecraft/paymentService' });
    serviceManager.register({ name: 'betService', path: '../services/minecraft/betService' });
    serviceManager.register({ name: 'teleportService', path: '../services/minecraft/teleportService' });

    // General 服務
    serviceManager.register({ name: 'authService', path: '../services/general/authService' });
    serviceManager.register({ name: 'blacklistService', path: '../services/general/blacklistService' });
    serviceManager.register({ name: 'databaseService', path: '../services/general/databaseService' });
    serviceManager.register({ name: 'errorHandler', path: '../services/general/errorHandler' });
    serviceManager.register({ name: 'errorHistoryService', path: '../services/general/errorHistoryService' });
    serviceManager.register({ name: 'linkService', path: '../services/general/linkService' });
    serviceManager.register({ name: 'rankService', path: '../services/general/rankService' });
    serviceManager.register({ name: 'ticketService', path: '../services/general/ticketService' });
    serviceManager.register({ name: 'userInfoService', path: '../services/general/userInfoService' });

    // Commands 處理器
    serviceManager.register({ name: 'commandHandler', path: '../commands/index' });
}

// 初始化所有服務
async function initializeServices() {
    registerServices();
    await serviceManager.initialize();
}

// 啟動應用
async function start() {
    await initializeServices();
    bot.start();
}

start();

rl.on('line', (input) => {
    if (mcClient.botInstance) mcClient.botInstance.chat(input);
});

process.on('uncaughtException', (err) => {
    Logger.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
    Logger.error('Unhandled Rejection:', err);
});
process.on('uncaughtExceptionMonitor', (err) => {
    Logger.error('Uncaught Exception Monitor:', err);
});