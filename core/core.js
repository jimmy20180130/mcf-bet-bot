const Logger = require("../utils/logger");
const { client } = require('./client');
const serviceManager = require('../services/serviceManager');
const mcBot = require('./mcBot');
const dcBot = require('./dcBot');
const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const bot = new mcBot({
    username: 'saraun',
    host: 'proxy-net-6.mcfallout.net',
    port: 25565,
    auth: 'microsoft',
    version: '1.20.1'
});

async function initServices() {
    Logger.info('[Core] 正在註冊服務...');

    // minecraft
    serviceManager.register({ name: 'paymentService', path: '../services/minecraft/paymentService' });
    serviceManager.register({ name: 'betService', path: '../services/minecraft/betService' });
    serviceManager.register({ name: 'teleportService', path: '../services/minecraft/teleportService' });
    serviceManager.register({ name: 'chatService', path: '../services/minecraft/chatService' });

    // general
    serviceManager.register({ name: 'authService', path: '../services/general/authService' });
    serviceManager.register({ name: 'blacklistService', path: '../services/general/blacklistService' });
    serviceManager.register({ name: 'databaseService', path: '../services/general/databaseService' });
    serviceManager.register({ name: 'errorHandler', path: '../services/general/errorHandler' });
    serviceManager.register({ name: 'errorHistoryService', path: '../services/general/errorHistoryService' });
    serviceManager.register({ name: 'linkService', path: '../services/general/linkService' });
    serviceManager.register({ name: 'rankService', path: '../services/general/rankService' });
    serviceManager.register({ name: 'ticketService', path: '../services/general/ticketService' });
    serviceManager.register({ name: 'userInfoService', path: '../services/general/userInfoService' });

    // command handler
    serviceManager.register({ name: 'commandHandler', path: '../commands/minecraft/index' });

    await serviceManager.initialize();
}

async function start() {
    Logger.info('[Core] 正在啟動 Discord bot...');
    await dcBot.init();

    Logger.info('[Core] 正在啟動 Minecraft bot...');
    bot.start();

    // 失敗則直接關閉
    try {
        await initServices();

    } catch (e) {
        Logger.error(`[Core] 初始化服務失敗，若設定無誤，請回報管理員: ${e.message}`, e);
        process.exit(1)
    }
}

start();

rl.on('line', (input) => {
    if (client.mcBot) client.mcBot.chat(input);
});

process.on('uncaughtException', (err) => {
    Logger.error('[Core] 若設定無誤，請回報管理員: Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
    Logger.error('[Core] 若設定無誤，請回報管理員: Unhandled Rejection:', err);
});
process.on('uncaughtExceptionMonitor', (err) => {
    Logger.error('[Core] 若設定無誤，請回報管理員: Uncaught Exception Monitor:', err);
});