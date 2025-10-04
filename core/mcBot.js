const mineflayer = require('mineflayer');
const Logger = require('../utils/logger');
const client = require('./client');
const blacklistService = require('../services/blacklistService');

// TODO: implement chat utils
// TODO: chat replace § with &
class Bot {
    constructor(options) {
        this.options = options;
        this.bot = null;
        // [{ playerid: '', time: 0 }]
        this.depositQueue = [];
    }

    start() {
        this.bot = mineflayer.createBot(this.options);
        this.bot.once('spawn', this.onSpawn.bind(this));
        this.bot.on('message', this.onMessage.bind(this));
        this.bot.on('error', this.onError.bind(this));
        this.bot.on('end', this.onEnd.bind(this));
        this.regCommands();
    }

    stop() {
        if (this.bot) {
            this.bot.end('程式主動關閉');
        }
    }

    regCommands() {
        client.emit('mcBotRegCommand');
    }

    onSpawn() {
        client.emit('mcBotSpawned', this.bot);
        // 要等到 spawn 完以後才能設 pattern
        // TODO: pattern 改為外部匯入的方式，避免到時候羅國貓又在皮
        this.bot.addChatPattern('command', /^\[([A-Za-z0-9_]+) -> 您\] ([\p{L}\p{N}_]+)\s*(.*)$/u);
        this.bot.addChatPattern('getEmerald', /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/);
        this.bot.addChatPattern('getCoin', /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/);
        this.bot.addChatPattern('tpRequest', /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/);

        this.bot.addChatPattern('epayProcessing', new RegExp(`^\[系統\] 正在處理您的其他請求, 請稍後`))
        this.bot.addChatPattern('epayNoMoney', /^\[系統\] 綠寶石不足, 尚需(.+)$/)
        this.bot.addChatPattern('epayNotSamePlace', /^\[系統\] 只能轉帳給同一分流的線上玩家\. 請檢查對方的ID與所在分流(.*)/)
        this.bot.addChatPattern('epaySuccess', /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/)
        this.bot.addChatPattern('epayNegative', new RegExp(`^\[系統\] 轉帳金額需為正數`))
        //this.bot.addChatPattern('epayInstructions', new RegExp(`^指令格式: /pay 玩家ID 綠寶石金額`))

        this.bot.addChatPattern('cpaySuccess', /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/)
        // /^[系統] 轉帳成功! (使用了 (d{1,3}(,d{3})*|d+) 村民錠, 剩餘 (d{1,3}(,d{3})*|d+) )/
        this.bot.addChatPattern('cpayDifferentName', new RegExp(`^\[系統\] 兩次所輸入的玩家名稱不一致!`))
        this.bot.addChatPattern('cpayNoMoney', /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/)

        this.bot.addChatPattern('generalCannotSend', new RegExp(`^\[系統\] 無法傳送訊息`))

        this.bot.on('chat:epayProcessing', () => client.emit('mcBotEpayProcessing'));
        this.bot.on('chat:epayNoMoney', (matches) => client.emit('mcBotEpayNoMoney', matches));
        this.bot.on('chat:epayNotSamePlace', () => client.emit('mcBotEpayNotSamePlace'));
        this.bot.on('chat:epaySuccess', (matches) => client.emit('mcBotEpaySuccess', matches));
        this.bot.on('chat:epayNegative', () => client.emit('mcBotEpayNegative'));
        //this.bot.on('chat:epayInstructions', () => client.emit('mcBotEpayNotSamePlace'));

        this.bot.on('chat:cpaySuccess', (matches) => client.emit('mcBotCpaySuccess', matches));
        this.bot.on('chat:cpayDifferentName', () => client.emit('mcBotCpayDifferentName'));
        this.bot.on('chat:cpayNoMoney', (matches) => client.emit('mcBotCpayNoMoney', matches));

        this.bot.on('chat:generalCannotSend', () => client.emit('mcBotGeneralCannotSend'));

        this.bot.on('chat:command', this.handleCommand.bind(this));
        this.bot.on('chat:getEmerald', this.handleGetEmerald.bind(this));
        this.bot.on('chat:getCoin', this.handleGetCoin.bind(this));
        this.bot.on('chat:tpRequest', this.handleTpRequest.bind(this));

        Logger.debug(`Jimmy Bot 已上線 (v=${this.bot.version})`);
        this.bot.chat(`Jimmy Bot 已上線 (v=${this.bot.version})`);
    }

    async handleCommand(matches) {
        // [Jimmy -> 您] <commandName> <args...>
        const text = matches[0];
        const regex = /^\[([A-Za-z0-9_]+) -> 您\] ([\p{L}\p{N}_]+)\s*(.*)$/u;
        const m = text.match(regex);
        if (!m) return;
        const playerId = m[1];
        const commandName = m[2];
        const args = m[3].trim();
        const command = Object.values(client.commands).find(cmd => cmd.name === commandName || cmd.aliases.includes(commandName));

        const isBlacklisted = await blacklistService.isBlacklisted(playerId);
        if (isBlacklisted.result && isBlacklisted.reason != 'NO_ACCEPT_EULA') {
            Logger.info(`封鎖指令: ${playerId} 嘗試使用 ${commandName} ${args}`);
            return;
        } else if (isBlacklisted.result && isBlacklisted.reason == 'NO_ACCEPT_EULA' && (command && command.name !== 'agreeEULA')) {
            Logger.info(`封鎖指令: ${playerId} 嘗試使用 ${commandName} ${args}，但尚未接受 EULA`);
            if (isBlacklisted.notified !== true) {
                this.bot.chat(`/m ${playerId} &c您尚未接受本機器人的使用條款，請加入 Discord 伺服器並詳閱條款後，私訊我 &7[&a同意條款&7] &c後方可使用本機器人`);
                await blacklistService.updateBlacklistInfo(playerId, { notified: true })
            }
            return;
        }

        const depositData = this.depositQueue.find(d => d.playerId === playerId);
        if (command && command.name == 'deposit' && depositData) {
            // remove from depositQueue
            this.depositQueue = this.depositQueue.filter(d => d.playerId !== playerId);
        } else if (command && command.name == 'deposit' && !depositData) {
            this.depositQueue.push({ playerId, time: Date.now() });
        }

        client.emit('mcBotCommand', { bot: this.bot, playerId, commandName, args });
    }

    async handleGetEmerald(matches) {
        const text = matches[0];
        const regex = /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)$/;
        const m = regex.exec(text);
        if (!m) return;
        const playerId = m[1];
        const amount = m[2];
        const currentAmount = m[5];

        // check if user is existed in depositQueue, if yes, emit mcBotDeposit event and remove from queue
        const depositData = this.depositQueue.find(d => d.playerId === playerId);
        if (depositData) {
            client.emit('mcBotDeposit', { bot: this.bot, playerId, amount, type: '&a綠寶石' });
            this.depositQueue = this.depositQueue.filter(d => d.playerId !== playerId);
        } else {
            // clean timeout deposits
            this.depositQueue = this.depositQueue.filter(d => d.time + 20000 > Date.now());
            client.emit('mcBotGetEmerald', { bot: this.bot, playerId, amount, currentAmount });
        }
    }

    handleGetCoin(matches) {
        const text = matches[0];
        const regex = /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)$/;
        const m = text.match(regex);
        if (!m) return;
        const playerId = m[1];
        const amount = m[2];
        const currentAmount = m[3];

        // check if user is existed in depositQueue, if yes, emit mcBotDeposit event and remove from queue
        const depositData = this.depositQueue.find(d => d.playerId === playerId);
        if (depositData && depositData.time + 20000 > Date.now()) { // 20 seconds
            client.emit('mcBotDeposit', { bot: this.bot, playerId, amount, type: '&6村民錠' });
            this.depositQueue = this.depositQueue.filter(d => d.playerId !== playerId);
        } else {
            // clean timeout deposits
            this.depositQueue = this.depositQueue.filter(d => d.time + 20000 > Date.now());
            client.emit('mcBotGetCoin', { bot: this.bot, playerId, amount, currentAmount });
        }
    }

    handleTpRequest(matches) {
        const text = matches[0];
        const regex1 = /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置$/;
        const regex2 = /^\[系統\] (\w+) 想要傳送到 你 的位置$/;
        let m1 = regex1.exec(text);
        let m2 = regex2.exec(text);
        if (!m1 && !m2) return;
        const playerId = m1 ? m1[1] : m2[1];
        client.emit('mcBotTpRequest', { bot: this.bot, playerId });
    }

    onMessage(message) {
        client.emit('mcBotMessage', message.toString());
        Logger.info(message.toAnsi())
    }

    onError(err) {
        Logger.error(`Bot 發生錯誤: ${err.message}`);
    }

    onEnd(reason) {
        Logger.warn(`Bot 斷線: ${reason || '未知原因'}`);
    }
}

module.exports = Bot;