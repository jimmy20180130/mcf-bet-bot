const mineflayer = require('mineflayer');
const Logger = require('../utils/logger');
const PayService = require('../services/payService');

class mcBot {
    // options
    // {
    //     username: '',
    //     host: '',
    // }
    constructor(options, index) {
        this.bot = null;
        this.index = index;
        this.options = {
            username: options.username || 'mcf-bet-bot',
            host: options.host || 'mcfallout.net',
            port: 25565,
            auth: 'microsoft',
            version: '1.20.1'
        };
    }

    start() {
        this.bot = mineflayer.createBot(this.options);
        this.bot.on('login', this._onLogin.bind(this));
        this.bot.on('spawn', this._onSpawn.bind(this));
        this.bot.on('error', this._onError.bind(this));
    }

    disconnect(reason) {
        this.bot.end(reason);
    }

    _onLogin() {
        console.log(`[${this.options.username}] 已登入伺服器 ${this.options.host}`);
    }

    _onSpawn() {
        // 在 spawn 事件觸發後才能 addChatPattern
        this._addChatPatterns();
        this.bot.payService = new PayService(this.bot);
        this.bot.chat('123');
    }

    _onError(err) {
        console.error(`[${this.options.username}] 遇到錯誤: ${err}`);
    }

    _addChatPatterns() {
        const chatPatterns = [
            { name: 'command', regex: /^\[([A-Za-z0-9_]+) -> 您\] ([\p{L}\p{N}_]+)\s*(.*)$/u, handler: '_handleCommand' },
            { name: 'getEmerald', regex: /^\[系統\] 您收到了\s+(\w+)\s+轉帳的 (\d{1,3}(,\d{3})*)( 綠寶石 \(目前擁有 (\d{1,3}(,\d{3})*)) 綠寶石\)/, handler: '_handleGetEmerald' },
            { name: 'getCoin', regex: /^\[系統\] 您收到了 (\S+) 送來的 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前擁有 (\d{1,3}(,\d{3})*|\d+) 村民錠\)/, handler: '_handleGetCoin' },
            { name: 'tpRequest', regex: /^\[系統\] (\w+) 想要你傳送到 該玩家 的位置|^\[系統\] (\w+) 想要傳送到 你 的位置/, handler: '_handleTpRequest' },
            { name: 'epayProcessing', regex: new RegExp(`^\[系統\] 正在處理您的其他請求, 請稍後`), handler: '_handleEpayProcessing' },
            { name: 'epayNoMoney', regex: /^\[系統\] 綠寶石不足, 尚需(.+)$/, handler: '_handleEpayNoMoney' },
            { name: 'epayNotSamePlace', regex: /^\[系統\] 只能轉帳給同一分流的線上玩家\. 請檢查對方的ID與所在分流(.*)/, handler: '_handleEpayNotSamePlace' },
            { name: 'epaySuccess', regex: /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/, handler: '_handleEpaySuccess' },
            { name: 'epayNegative', regex: new RegExp(`^\[系統\] 轉帳金額需為正數`), handler: '_handleEpayNegative' },
            // /^[系統] 轉帳成功! (使用了 (d{1,3}(,d{3})*|d+) 村民錠, 剩餘 (d{1,3}(,d{3})*|d+) )/
            { name: 'cpaySuccess', regex: /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/, handler: '_handleCpaySuccess' },
            { name: 'cpayDifferentName', regex: new RegExp(`^\[系統\] 兩次所輸入的玩家名稱不一致!`), handler: '_handleCpayDifferentName' },
            { name: 'cpayNoMoney', regex: /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/, handler: '_handleCpayNoMoney' },
            { name: 'generalCannotSend', regex: new RegExp(`^\[系統\] 無法傳送訊息`), handler: '_handleGeneralCannotSend' }
            // { name: 'epayInstructions', regex: new RegExp(`^指令格式: /pay 玩家ID 綠寶石金額`), handler: '_handleEpayInstructions' }
        ]

        chatPatterns.forEach(({ name, regex, handler }) => {
            this.bot.addChatPattern(name, regex);

            if (this[handler]) {
                this.bot.on(`chat:${name}`, (matches) => {
                    this[handler](matches);
                });
            } else {
                Logger.warn(`跳過訊息格式 ${name}: 無法找到處理該訊息格式的函式 ${handler}`);
            }
        });
    }

    _handleCommand(matches) {
        const [, sender, command, args] = matches;
        Logger.debug(`[${this.options.username}] 收到指令: ${command} 參數: ${args} 來自: ${sender}`);
    }

    _handleGetEmerald(matches) {
        const [, sender, amount, , current] = matches;
        Logger.debug(`[${this.options.username}] 收到綠寶石轉帳: ${amount} 綠寶石 來自: ${sender} 目前擁有: ${current} 綠寶石`);
    }

    _handleGetCoin(matches) {
        const [, sender, amount, , current] = matches;
        Logger.debug(`[${this.options.username}] 收到村民錠轉帳: ${amount} 村民錠 來自: ${sender} 目前擁有: ${current} 村民錠`);
    }

    _handleTpRequest(matches) {
        const sender = matches[1] || matches[2];
        Logger.debug(`[${this.options.username}] 收到傳送請求來自: ${sender}`);
    }
}

module.exports = mcBot;