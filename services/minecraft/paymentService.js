const Logger = require('../../utils/logger');
const { client, mcClient } = require('../../core/client');
const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../general/userInfoService');
const { addCommas, removeCommas } = require('../../utils/format');
const { PaymentError, ValidationError } = require('../../utils/errors');

class PaymentService {
    constructor() {
        this.bot = null;
        this.activePayments = new Map();
        this.eventHandlers = [];
    }

    init() {
        mcClient.on('spawned', (bot) => {
            this.bot = bot;
            this._setupHandlers();
        });
    }

    cleanup() {
        Logger.debug('[PaymentService.cleanup] 清理 PaymentService');
        this.bot = null;
        this.activePayments.clear();
        
        // 移除所有事件監聽器
        for (const handler of this.eventHandlers) {
            mcClient.removeListener(handler.event, handler.listener);
        }
        this.eventHandlers = [];
    }

    async pay(type, player, amount) {
        amount = this._parseAmount(amount);
        this._validatePayment(type, player, amount);
        
        const payment = this._createPayment(type, player, amount);
        this.activePayments.set(payment.id, payment);
        
        try {
            await this._executePayment(payment);
            return await this._waitForResult(payment);
        } catch (error) {
            this.activePayments.delete(payment.id);
            throw error;
        }
    }

    async epay(player, amount) {
        return this.pay('emerald', player, amount);
    }

    async cpay(player, amount) {
        return this.pay('coin', player, amount);
    }

    _validatePayment(type, player, amount) {
        if (!this.bot) throw PaymentError.botNotReady();
        if (!player || typeof player !== 'string') {
            throw new ValidationError('無效的玩家 ID', 'player');
        }
        if (!Number.isInteger(amount) || amount <= 0) {
            throw PaymentError.invalidAmount(amount);
        }
        if (!['emerald', 'coin'].includes(type)) {
            throw new ValidationError('無效的幣種', 'type');
        }
    }

    _createPayment(type, player, amount) {
        return {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            type,
            player,
            amount,
            status: 'pending',
            timestamp: Date.now(),
            promise: null
        };
    }

    _executePayment(payment) {
        Logger.info(`[paymentService.executePayment.${payment.type}] 開始轉帳 ${addCommas(payment.amount)} 個 ${payment.type === 'emerald' ? '綠寶石' : '村民錠'} 給 ${payment.player}`);
        Logger.debug(`[paymentService.executePayment.${payment.type}] Payment ID: ${payment.id}`);
        
        if (payment.type === 'emerald') {
            this.bot.chat(`/pay ${payment.player} ${payment.amount}`);
        } else if (payment.type === 'coin') {
            this.bot.chat(`/cointrans ${payment.player} ${payment.amount}`);
            setTimeout(() => this.bot.chat(payment.player), 500);
        }
    }

    _waitForResult(payment) {
        return new Promise((resolve, reject) => {
            payment.resolve = resolve;
            payment.reject = reject;
            
            // Simple timeout
            setTimeout(() => {
                if (this.activePayments.has(payment.id)) {
                    this.activePayments.delete(payment.id);
                    reject(PaymentError.timeout(payment.type, payment.player, payment.amount));
                }
            }, 10000);
        });
    }

    _setupHandlers() {
        // 儲存事件處理器以便後續清理
        const addHandler = (event, listener) => {
            mcClient.on(event, listener);
            this.eventHandlers.push({ event, listener });
        };

        // epay
        addHandler('epaySuccess', (matches) => {
            let match = /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/.exec(matches[0])
            this._handleSuccess('emerald', match[2], match[1], match[3]);
        });
        
        addHandler('epayNoMoney', (matches) => {
            let match = /^\[系統\] 綠寶石不足, 尚需(.+)$/.exec(matches[0]);
            this._handleFailure('emerald', PaymentError.insufficientBalance('emerald', match[1], 'unknown'));
        });
        
        addHandler('epayNotSamePlace', () =>
            this._handleFailure('emerald', PaymentError.playerNotFound('目標玩家')));
        
        addHandler('epayNegative', () =>
            this._handleFailure('emerald', PaymentError.invalidAmount('negative')));

        // cpay
        addHandler('cpaySuccess', (matches) => {
            // matches: [ "[系統] 轉帳成功! (使用了 1 村民錠, 剩餘 5 )" ]
            let match = /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/.exec(matches[0])
            this._handleSuccess('coin', null, match[1], match[3]);
        });
        
        addHandler('cpayNoMoney', (matches) => {
            let match = /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/.exec(matches[0])
            this._handleFailure('coin', PaymentError.insufficientBalance('coin', match[1], match[3]));
        });
        
        addHandler('cpayDifferentName', () => 
            this._handleFailure('coin', PaymentError.playerNotFound('目標玩家')));

        // General handlers
        addHandler('generalCannotSend', () => 
            this._handleFailure(null, PaymentError.cannotSendMessage()));
    }

    _handleSuccess(type, player, amount, balance) {
        const payment = this._findPayment(type, player, amount);
        if (!payment) return;

        this.activePayments.delete(payment.id);
        
        const result = {
            type: payment.type,
            player: payment.player,
            amount: payment.amount,
            balance: this._parseAmount(balance)
        };

        Logger.info(`[paymentService.handleSuccess.${payment.type}] 成功支付 ${addCommas(payment.amount)} 個 ${payment.type === 'emerald' ? '綠寶石' : '村民錠'} 給 ${payment.player}`);
        payment.resolve(result);
    }

    async _handleFailure(type, error) {
        const payment = this._findPayment(type);
        if (!payment) {
            Logger.debug(`[paymentService.handleFailure.${type || 'unknown'}] 找不到支付請求: ${error.message || error}`);
            return;
        }

        this.activePayments.delete(payment.id);
        
        // 確保錯誤是 PaymentError 實例
        const paymentError = error instanceof PaymentError 
            ? error 
            : new PaymentError(typeof error === 'string' ? error : error.message, 'PAYMENT_ERROR');
        
        Logger.error(`[paymentService.handleFailure.${payment.type}] 支付失敗: ${paymentError.message} (ID: ${payment.id})`);
        
        // if failed and reason is timeout => notify user
        // if failed because of other reason => add to wallet
        try {
            const playerUUID = await userinfoService.getMinecraftUUID(payment.player);
            if (playerUUID) {
                await userRepository.updateWallet(playerUUID, payment.type === 'emerald' ? 'eWallet' : 'cWallet', payment.amount);
                Logger.info(`[paymentService._handleFailure.${payment.type}] 已將 ${addCommas(payment.amount)} 個 ${payment.type === 'emerald' ? '綠寶石' : '村民錠'} 退回至 ${payment.player} 的錢包`);
            }
        } catch (walletError) {
            Logger.error(`[paymentService._handleFailure.${payment.type}] 更新錢包失敗:`, walletError);
        }

        payment.reject(paymentError);
    }

    _findPayment(type, player = null, amount = null) {
        for (const payment of this.activePayments.values()) {
            if (type && payment.type !== type) continue;
            if (player && payment.player !== player) continue;
            if (amount && payment.amount !== this._parseAmount(amount)) continue;
            return payment;
        }
        return null;
    }

    _parseAmount(amountStr) {
        return parseInt(String(amountStr).replace(/,/g, ''));
    }

    getActivePayments() {
        return Array.from(this.activePayments.values()).map(p => ({
            id: p.id,
            type: p.type, 
            player: p.player,
            amount: p.amount,
            age: Date.now() - p.timestamp
        }));
    }
}

const paymentService = new PaymentService();

module.exports = paymentService;