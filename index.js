const mcBot = require('./core/mcBot');
const toml = require('smol-toml');
const fs = require('fs');
const rl = require('readline');
const Logger = require('./utils/logger');
const logger = new Logger('Core', true);
const config = toml.parse(fs.readFileSync('./config.toml', 'utf-8'));

// 讓使用者可以在 console 輸入指令來控制 bot，例如輸入 "stop" 來停止所有 bot
const consoleInterface = rl.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mcBots = [];

consoleInterface.on('line', (input) => {
    const message = input.trim().toLowerCase();

    if (message.startsWith('>')) {
        const command = message.slice(1);
        const args = command.split(' ').slice(1);

        switch (command) {
            case 'stop':
                if (args[0]) {
                    const botIndex = parseInt(args[0]);
                    if (botIndex >= 0 && botIndex < mcBots.length) {
                        mcBots[botIndex].stop = true;
                        if (mcBots[botIndex].bot) {
                            mcBots[botIndex].bot.end('stop');
                        }
                    } else {
                        logger.warn(`無效的 bot 索引: ${botIndex}`);
                    }
                } else {
                    logger.warn('正在停止所有 bot...');
                    mcBots.forEach(mc => {
                        if (mc.bot) {
                            mc.bot.end('stop');
                        }
                        mc.stop = true;
                    });
                    consoleInterface.close();
                    process.exit(0);
                }
                break;

            default:
                logger.warn(`未知指令: ${command}`);
        }
    } else {
        // 如果訊息不包含冒號，則廣播給所有 bot
        if (!message.includes(':')) {
            for (let i = 0; i < mcBots.length; i++) {
                mcBots[i]?.bot?.chat(message);
            }
            return;
        }

        // 輸入訊息給 1 號 bot，格式為 "1: hello world"
        const [botIndexStr, ...messageParts] = message.split(':');
        const botIndex = parseInt(botIndexStr);
        const messageToSend = messageParts.join('').trim();
        if (!mcBots[botIndex-1]) {
            logger.warn(`無效的 bot 索引: ${botIndex}`);
            return;
        } else if (!messageToSend) {
            logger.warn('請輸入要發送的訊息');
            return;
        } else {
            mcBots[botIndex-1]?.bot?.chat(messageToSend);
        }
    }
});

for (let i = 0; i < config.bots.length; i++) {
    const mc = new mcBot(config.bots[i], i);
    mc.start();
    mcBots.push(mc);
}

// if mcbot triggered end event, restart it after 5 seconds
setInterval(() => {
    mcBots.forEach((mc, index) => {
        if (!mc.bot && !mc.stop) {
            logger.warn(`[${mc.options.username}] 連線已斷開，正在嘗試重新連線...`);
            mc.start();
        }
    });
}, 5000);