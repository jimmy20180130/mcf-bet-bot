const mcBot = require('./core/mcBot');
const toml = require('smol-toml');
const fs = require('fs');

const config = toml.parse(fs.readFileSync('./config.toml', 'utf-8'));

const mcBots = [];

for (let i=0; i < config.bots.length; i++) {
    const mc = new mcBot(config.bots[i], i);
    mc.start();
    mcBots.push(mc);
}

// if mcbot triggered end event, restart it after 5 seconds
setInterval(() => {
    mcBots.forEach((mc, index) => {
        if (!mc.bot) {
            console.warn(`[${mc.options.username}] 連線已斷開，正在嘗試重新連線...`);
            mc.start();
        }
    });
}, 5000);