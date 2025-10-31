const EventEmitter = require('events');
const Logger = require('../utils/logger');

const client = new EventEmitter();
client.version = '3.1.0-beta.1';
client.mcCommands = new Map();
client.dcCommands = new Map();
client.mcBot = null;
client.dcBot = null;

// 保存 bot 實例
client.on('mcSpawned', (bot) => {
    client.mcBot = bot;
});

module.exports = {
    client,
};