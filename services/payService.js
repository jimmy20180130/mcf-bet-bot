const Logger = require('../utils/logger');

class PayService {
    constructor(bot) {
        this.bot = bot;
        this.queue = [];
        this.isProcessing = false;
    }

    async pay(target, amount) {
        return new Promise((resolve, reject) => {
            this.queue.push({ target, amount, resolve, reject });
            this._execute();
        });
    }

    async _execute() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        const task = this.queue.shift();
        const { target, amount, resolve, reject } = task;

        try {
            Logger.info(`[PayService] 準備處理轉帳: ${target} ${amount} (剩餘任務: ${this.queue.length})`);
            const result = await this._performTransfer(target, amount);
            resolve(result);

        } catch (err) {
            Logger.error(`[PayService] 轉帳失敗: ${err.message}`);
            reject(err);

        } finally {
            await new Promise(r => setTimeout(r, 500));
            this.isProcessing = false;
            this._execute();
        }
    }

    // haven't implemented yet
    _performTransfer(target, amount) {
        // return new Promise((resolve, reject) => {
        //     let finalized = false;

        //     const onSuccess = (matches) => {
        //         if (finalized) return;
        //         // 這裡加入你的金額與 ID 比對邏輯
        //         if (matches[2] === target) {
        //             cleanup();
        //             resolve({ success: true, target, amount });
        //         }
        //     };

        //     const onFailure = (matches) => {
        //         if (finalized) return;
        //         cleanup();
        //         reject(new Error(matches[0]));
        //     };

        //     const cleanup = () => {
        //         finalized = true;
        //         clearTimeout(timer);
        //         this.bot.removeListener('chat:epaySuccess', onSuccess);
        //         this.bot.removeListener('chat:epayNoMoney', onFailure);
        //     };

        //     const timer = setTimeout(() => {
        //         if (finalized) return;
        //         cleanup();
        //         // 記得加上之前討論的垃圾回收 (GC) 邏輯
        //         reject(new Error('伺服器回應逾時'));
        //     }, 10000);

        //     this.bot.on('chat:epaySuccess', onSuccess);
        //     this.bot.on('chat:epayNoMoney', onFailure);
            
        //     this.bot.chat(`/epay ${target} ${amount}`);
        // });
    }
}

module.exports = PayService;