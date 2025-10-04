const EventEmitter = require('events');
const client = new EventEmitter();

client.commands = {};
client.mcBotInstance = null;

client.on('mcBotRegCommand', () => {
    const commandHandler = require('../commands/index');
    commandHandler.registerCommands();
});

client.on('mcBotSpawned', (botInstance) => {
    client.mcBotInstance = botInstance;
});

module.exports = client;