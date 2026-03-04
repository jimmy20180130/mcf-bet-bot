const mcBot = require('./core/mcBot');
const toml = require('smol-toml');
const fs = require('fs');

const config = toml.parse(fs.readFileSync('./config.toml', 'utf-8'));

for (let i=0; i < config.bots.length; i++) {
    const mc = new mcBot(config.bots[i], i);
    mc.start();
}