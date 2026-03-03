const Logger = require('../../utils/logger');
const { client } = require('../../core/client');
const userRepository = require('../../repositories').userRepository;
const userinfoService = require('../general/userInfoService');
const { addCommas, removeCommas } = require('../../utils/format');
const { PaymentError, ValidationError } = require('../../utils/errors');
const chatService = require('./chatService');

class PaymentService {
    constructor() {
        this.activePayments = new Map(); // 所有已建立但未完成的 payment
        this.queue = []; // FIFO 隊列，確保一次只處理一筆
        this.processing = false; // 是否正在處理中
        this.eventHandlers = [];
        this.currentPayment = null; // 正在送出的那筆
    }

    init() {
        this._setupHandlers();
    }

    cleanup() {
        Logger.debug('[PaymentService.cleanup] 清理 PaymentService');
        this.activePayments.clear();
        this.queue = [];
        this.processing = false;
        this.currentPayment = null;

        for (const handler of this.eventHandlers) {
            client.removeListener(handler.event, handler.listener);
        }
        this.eventHandlers = [];
    }

    async pay(type, player, amount) {
        amount = this._parseAmount(amount);
        this._validatePayment(type, player, amount);

        const payment = this._createPayment(type, player, amount);
        // promise 會在處理完成時 resolve/reject
        payment.promise = new Promise((resolve, reject) => {
            payment.resolve = resolve;
            payment.reject = reject;
        });

        this.activePayments.set(payment.id, payment);
        this.queue.push(payment);

        // 啟動處理（如果尚未啟動）
        this._processQueue();

        return payment.promise;
    }

    async epay(player, amount) {
        return this.pay('emerald', player, amount);
    }

    async cpay(player, amount) {
        return this.pay('coin', player, amount);
    }

    _validatePayment(type, player, amount) {
        if (!client.mcBot) throw PaymentError.botNotReady();
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
            attempts: 0,
            maxAttempts: 3
        };
    }

    // 啟動或繼續處理隊列
    async _processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const payment = this.queue.shift();
            this.currentPayment = payment;

            try {
                await this._processSinglePayment(payment);
            } catch (err) {
                // 已由個別流程處理 reject
                Logger.error('[PaymentService._processQueue] 處理失敗', err && err.message ? err.message : err);
            } finally {
                this.currentPayment = null;
                // 確保 payment 從 activePayments 移除（若還在的話）
                if (this.activePayments.has(payment.id)) this.activePayments.delete(payment.id);
            }
        }

        this.processing = false;
    }

    async _processSinglePayment(payment) {
        payment.attempts += 1;

        Logger.info(`[paymentService.process] 處理 ${payment.id} - ${payment.type} ${addCommas(payment.amount)} -> ${payment.player} (嘗試 ${payment.attempts}/${payment.maxAttempts})`);

        // 送出指令
        this._executePayment(payment);

        // 等待結果或 rate-limit，會由事件 handler 呼叫 resolve/reject
        try {
            const result = await this._waitForResult(payment, 15000);
            return result;
        } catch (err) {
            // 若是系統忙碌（由事件回報），且尚有重試次數，則等待後重試
            if (err && err.code === 'RATE_LIMIT' && payment.attempts < payment.maxAttempts) {
                const backoff = 500 * Math.pow(2, payment.attempts - 1);
                Logger.info(`[paymentService.process] 進行重試，延遲 ${backoff}ms - ${payment.id}`);
                await new Promise(r => setTimeout(r, backoff));
                // 重新放回隊列頭，確保序列性
                this.queue.unshift(payment);
                return;
            }

            // 其他錯誤或重試用盡 -> 拒絕
            if (!payment.rejectCalled) {
                payment.rejectCalled = true;
                payment.reject(err instanceof Error ? err : new PaymentError(err && err.message ? err.message : 'UNKNOWN', 'PAYMENT_ERROR'));
            }
            return;
        }
    }

    _executePayment(payment) {
        Logger.info(`[paymentService.executePayment.${payment.type}] 開始轉帳 ${addCommas(payment.amount)} 個 ${payment.type === 'emerald' ? '綠寶石' : '村民錠'} 給 ${payment.player}`);
        Logger.debug(`[paymentService.executePayment.${payment.type}] Payment ID: ${payment.id}`);

        if (payment.type === 'emerald') {
            chatService.addMessage(`/pay ${payment.player} ${payment.amount}`)
        } else if (payment.type === 'coin') {
            chatService.addMessage(`/cointrans ${payment.player} ${payment.amount}`);
            setTimeout(() => chatService.addMessage(payment.player), 500);
        }
    }

    _waitForResult(payment, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                // 逾時
                if (this.activePayments.has(payment.id)) {
                    // 若逾時且非在處理中的 payment，就直接 reject
                    const err = PaymentError.timeout(payment.type, payment.player, payment.amount);
                    reject(err);
                }
            }, timeoutMs);

            // 包裝 resolve/reject，讓事件 handler 可以呼叫
            payment._internalResolve = (result) => {
                clearTimeout(timeout);
                resolve(result);
            };

            payment._internalReject = (err) => {
                clearTimeout(timeout);
                reject(err);
            };
        });
    }

    _setupHandlers() {
        const addHandler = (event, listener) => {
            client.on(event, listener);
            this.eventHandlers.push({ event, listener });
        };

        // epay 成功訊息
        addHandler('epaySuccess', (matches) => {
            const match = /^\[系統\] 成功轉帳 (.*) 綠寶石 給 (.*) \(目前擁有 (.*) 綠寶石\)/.exec(matches[0]);
            if (!match) return;
            const amount = this._parseAmount(match[1]);
            const player = match[2];
            const balance = match[3];
            this._handleSuccess('emerald', player, amount, balance);
        });

        addHandler('epayNoMoney', (matches) => {
            const match = /^\[系統\] 綠寶石不足, 尚需(.+)$/.exec(matches[0]);
            const need = match ? this._parseAmount(match[1]) : null;
            this._handleFailure('emerald', PaymentError.insufficientBalance('emerald', need, 'unknown'));
        });

        addHandler('epayNotSamePlace', () =>
            this._handleFailure('emerald', PaymentError.playerNotFound('目標玩家')));

        addHandler('epayNegative', () =>
            this._handleFailure('emerald', PaymentError.invalidAmount('negative')));

        // cpay
        addHandler('cpaySuccess', (matches) => {
            const match = /^\[系統\] 轉帳成功! \(使用了 (\d{1,3}(,\d{3})*|\d+) 村民錠, 剩餘 (\d{1,3}(,\d{3})*|\d+) \)$/.exec(matches[0]);
            if (!match) return;
            const used = this._parseAmount(match[1]);
            const balance = match[3];
            // coin 轉帳訊息不包含對象，使用目前處理中的 payment
            this._handleSuccess('coin', null, used, balance);
        });

        addHandler('cpayNoMoney', (matches) => {
            const match = /^\[系統\] 村民錠不足, 尚需 (\d{1,3}(,\d{3})*|\d+) 村民錠\. \(目前剩餘 (\d{1,3}(,\d{3})*|\d+) \)/.exec(matches[0]);
            const need = match ? this._parseAmount(match[1]) : null;
            const have = match ? this._parseAmount(match[2]) : null;
            this._handleFailure('coin', PaymentError.insufficientBalance('coin', need, have));
        });

        addHandler('cpayDifferentName', () =>
            this._handleFailure('coin', PaymentError.playerNotFound('目標玩家')));

        // 系統忙碌的訊息 -> 需重試
        addHandler('systemBusy', (matches) => {
            // 範例: "[系統] 正在處理您的其他請求, 請稍後."
            if (!this.currentPayment) return;
            const err = new Error('系統忙碌，請稍後再試');
            err.code = 'RATE_LIMIT';
            // 直接交由目前處理流程的 catch 處理重試邏輯
            if (this.currentPayment._internalReject) this.currentPayment._internalReject(err);
        });

        // 無法發送訊息
        addHandler('generalCannotSend', () =>
            this._handleFailure(null, PaymentError.cannotSendMessage()));
    }

    _handleSuccess(type, player, amount, balance) {
        // 找到最早 pending 且匹配的 payment。若 player 為 null，代表訊息內沒有 player，則使用 currentPayment
        let payment = null;
        if (player) {
            payment = this._findPayment(type, player, amount);
        } else if (this.currentPayment && this.currentPayment.type === type && this.currentPayment.amount === this._parseAmount(amount)) {
            payment = this.currentPayment;
        } else {
            payment = this._findPayment(type, null, amount);
        }

        if (!payment) {
            Logger.debug('[paymentService.handleSuccess] 找不到對應的 payment');
            return;
        }

        // 移除並回報
        if (this.activePayments.has(payment.id)) this.activePayments.delete(payment.id);

        const result = {
            type: payment.type,
            player: payment.player,
            amount: payment.amount,
            balance: this._parseAmount(balance)
        };

        Logger.info(`[paymentService.handleSuccess.${payment.type}] 成功支付 ${addCommas(payment.amount)} 給 ${payment.player}`);

        if (payment._internalResolve) payment._internalResolve(result);
        if (!payment.resolveCalled) {
            payment.resolveCalled = true;
            payment.resolve(result);
        }
    }

    async _handleFailure(type, error) {
        // 若有正在處理的 payment，優先取該筆
        const payment = this.currentPayment || this._findPayment(type);
        if (!payment) {
            Logger.debug(`[paymentService.handleFailure.${type || 'unknown'}] 找不到支付請求: ${error.message || error}`);
            return;
        }

        if (this.activePayments.has(payment.id)) this.activePayments.delete(payment.id);

        const paymentError = error instanceof PaymentError
            ? error
            : new PaymentError(typeof error === 'string' ? error : error.message, 'PAYMENT_ERROR');

        Logger.error(`[paymentService.handleFailure.${payment.type}] 支付失敗: ${paymentError.message} (ID: ${payment.id})`);

        try {
            const playerUUID = await userinfoService.getMinecraftUUID(payment.player);
            if (playerUUID) {
                await userRepository.updateWallet(playerUUID, payment.type === 'emerald' ? 'eWallet' : 'cWallet', payment.amount);
                Logger.info(`[paymentService._handleFailure.${payment.type}] 已將 ${addCommas(payment.amount)} 退回錢包給 ${payment.player}`);
            }
        } catch (walletError) {
            Logger.error(`[paymentService._handleFailure.${payment.type}] 更新錢包失敗:`, walletError);
        }

        if (payment._internalReject) payment._internalReject(paymentError);
        if (!payment.rejectCalled) {
            payment.rejectCalled = true;
            payment.reject(paymentError);
        }
    }

    _findPayment(type, player = null, amount = null) {
        const candidates = [];
        for (const payment of this.activePayments.values()) {
            if (type && payment.type !== type) continue;
            if (player && payment.player !== player) continue;
            if (amount && payment.amount !== this._parseAmount(amount)) continue;
            candidates.push(payment);
        }
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => a.timestamp - b.timestamp);
        return candidates[0];
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
paymentService.name = 'paymentService';

module.exports = paymentService;
