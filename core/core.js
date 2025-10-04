const Logger = require("../utils/logger");
const fs = require('fs');
const client = require('./client');
const mcBot = require('./mcBot')
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
})

// require all services to init them
fs.readdirSync('./services').forEach(file => {
    if (file.endsWith('.js')) {
        require(`../services/${file}`);
    }
});

bot.start()

rl.on('line', (input) => {
    if (client.mcBotInstance) client.mcBotInstance.chat(input);
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