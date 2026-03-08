const fs = require('fs');
const User = require('../../models/User');

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

    let user = User.getByPlayerId(sender);
    if (!user) {
        const playeruuid = await bot.MinecraftDataService.getPlayerId(sender);
        if (!playeruuid) {
            return;
        } else {
            User.create({ playerid: sender, playeruuid });
        }
    }

    user = User.getByPlayerId(sender);
    if (!user) {
        bot.chat(`/m ${sender} 執行指令時發生不可預期的錯誤，請稍後再試或聯繫機器人開發者`);
        this.bot.logger.error(`無法找到且無法創建使用者資料: ${sender}`);
        return;
    }

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