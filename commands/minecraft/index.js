const fs = require('fs');

const commandFiles = fs.readdirSync('./commands/minecraft').filter(file => file.endsWith('.js'));
const commands = new Map();

for (const file of commandFiles) {
    const command = require(`./${file}`);
    commands.set(command.name, command);
    if (command.aliases) {
        command.aliases.forEach(alias => {
            commands.set(alias, command);
        });
    }
}

async function executeCommand(bot, sender, command, args) {
    const cmd = commands.get(command);
    if (!cmd) return

    try {
        await cmd.execute(bot, command, sender, args);
    } catch (err) {
        bot.logger.error(`執行指令 ${command} 時發生錯誤: ${err}`);
        bot.chat(`/msg ${sender} 執行指令 ${command} 時發生錯誤: ${err.message}`);
    }
}

module.exports = {
    executeCommand
};