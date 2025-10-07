const databaseService = require('../services/general/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 支付記錄 Repository
 * 管理所有支付交易記錄
 * 
 * 資料格式:
 * - payID: 支付交易唯一識別碼
 * - playerUUID: 玩家唯一識別碼
 * - amount: 支付金額
 * - currency: 貨幣類型 ('emerald' 或 'coin')
 * - result: 支付結果 ('success', 'failed', 'pending')
 * - reason: 支付原因/描述
 * - createDate: 交易創建日期
 */
class PaymentRepository {
    constructor() {
        this.prefix = 'paymentRecord:';
    }

    /**
     * 生成支付 ID
     * @returns {string} 唯一的支付 ID
     */
    generatePayID() {
        return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * 創建支付記錄
     * @param {Object} paymentData - 支付資料
     * @param {string} paymentData.playerUUID - 玩家 UUID
     * @param {number} paymentData.amount - 支付金額
     * @param {string} paymentData.currency - 貨幣類型 ('emerald' 或 'coin')
     * @param {string} paymentData.result - 支付結果 ('success', 'failed', 'pending')
     * @param {string} paymentData.reason - 支付原因/描述
     * @param {string} paymentData.payID - 支付 ID (可選，會自動生成)
     * @param {Object} paymentData.additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object|null>} 創建的支付記錄，失敗則回傳 null
     */
    async createPayment(paymentData) {
        try {
            const { playerUUID, amount, currency, result = 'pending', reason = '', payID = null, additionalInfo = {} } = paymentData;
            
            if (!playerUUID || amount === undefined || !currency) {
                throw new Error('playerUUID、amount 和 currency 為必填欄位');
            }

            if (!['emerald', 'coin'].includes(currency)) {
                throw new Error('currency 必須是 emerald 或 coin');
            }

            if (!['success', 'timeout', 'notSamePlace', 'noMoney', 'negative', 'cantSendMsg'].includes(result)) {
                throw new Error('result 必須是 success、timeout、notSamePlace、noMoney、negative 或 cantSendMsg');
            }

            const generatedPayID = payID || this.generatePayID();

            // 檢查 payID 是否已存在
            const existingPayment = await this.getPaymentByID(generatedPayID);
            if (existingPayment) {
                throw new Error(`支付記錄 ${generatedPayID} 已存在`);
            }

            const payment = {
                payID: generatedPayID,
                playerUUID,
                amount,
                currency,
                result,
                reason,
                createDate: Math.floor(Date.now() / 1000), // unixtimestamp, second precision
                additionalInfo
            };

            const success = await databaseService.put(`${this.prefix}${generatedPayID}`, payment);
            if (success) {
                Logger.info(`[PaymentRepository.createPayment] 創建支付記錄: ${generatedPayID} (${playerUUID}, ${amount} ${currency}, ${reason || '無原因'})`);
                return payment;
            }
            return null;
        } catch (error) {
            Logger.error(`[PaymentRepository.createPayment] 創建支付記錄失敗:`, error);
            return null;
        }
    }

    /**
     * 根據支付 ID 獲取支付記錄
     * @param {string} payID - 支付 ID
     * @returns {Promise<Object|null>} 支付記錄
     */
    async getPaymentByID(payID) {
        try {
            const payment = await databaseService.get(`${this.prefix}${payID}`);
            if (payment) {
                Logger.debug(`[PaymentRepository.getPaymentByID] 找到支付記錄: ${payID}`);
            }
            return payment;
        } catch (error) {
            Logger.error(`[PaymentRepository.getPaymentByID] 獲取支付記錄失敗 (${payID}):`, error);
            return null;
        }
    }

    /**
     * 獲取用戶的支付記錄
     * @param {string} playerUUID - 玩家 UUID
     * @param {Object} options - 查詢選項
     * @param {number} options.limit - 限制數量 (可選)
     * @param {string} options.currency - 貨幣類型篩選 (可選)
     * @param {string} options.result - 結果篩選 (可選)
     * @returns {Promise<Object[]>} 支付記錄列表
     */
    async getUserPayments(playerUUID, options = {}) {
        try {
            const { limit = null, currency = null, result = null } = options;
            
            const allPayments = await databaseService.getRange(this.prefix);
            let userPayments = Object.values(allPayments)
                .filter(payment => payment.playerUUID === playerUUID);

            // 應用篩選條件
            if (currency) {
                userPayments = userPayments.filter(payment => payment.currency === currency);
            }
            if (result) {
                userPayments = userPayments.filter(payment => payment.result === result);
            }

            // 按創建日期排序 (最新的在前)
            userPayments.sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            // 應用數量限制
            if (limit) {
                userPayments = userPayments.slice(0, limit);
            }

            Logger.debug(`[PaymentRepository.getUserPayments] 獲取用戶 ${playerUUID} 的 ${userPayments.length} 筆支付記錄`);
            return userPayments;
        } catch (error) {
            Logger.error(`[PaymentRepository.getUserPayments] 獲取用戶支付記錄失敗 (${playerUUID}):`, error);
            return [];
        }
    }

    /**
     * 更新支付記錄狀態
     * @param {string} payID - 支付 ID
     * @param {string} newResult - 新的支付結果
     * @param {Object} additionalInfo - 額外資訊 (可選)
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updatePaymentStatus(payID, newResult, additionalInfo = {}) {
        try {
            const existingPayment = await this.getPaymentByID(payID);
            if (!existingPayment) {
                throw new Error(`支付記錄 ${payID} 不存在`);
            }

            if (!['success', 'failed', 'pending'].includes(newResult)) {
                throw new Error('result 必須是 success、failed 或 pending');
            }

            const updatedPayment = {
                ...existingPayment,
                result: newResult,
                updatedDate: new Date().toISOString(),
                additionalInfo: {
                    ...existingPayment.additionalInfo,
                    ...additionalInfo
                }
            };

            const success = await databaseService.put(`${this.prefix}${payID}`, updatedPayment);
            if (success) {
                Logger.info(`[PaymentRepository.updatePaymentStatus] 更新支付狀態: ${payID} -> ${newResult}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[PaymentRepository.updatePaymentStatus] 更新支付狀態失敗 (${payID}):`, error);
            return false;
        }
    }

    /**
     * 獲取支付統計資訊
     * @param {Object} options - 統計選項
     * @param {string} options.playerUUID - 特定用戶 (可選)
     * @param {string} options.currency - 特定貨幣 (可選)
     * @param {string} options.timeRange - 時間範圍 ('day', 'week', 'month', 'all')
     * @returns {Promise<Object>} 支付統計資訊
     */
    async getPaymentStats(options = {}) {
        try {
            const { playerUUID = null, currency = null, timeRange = 'all' } = options;
            
            let allPayments = await databaseService.getRange(this.prefix);
            allPayments = Object.values(allPayments);

            // 應用篩選條件
            if (playerUUID) {
                allPayments = allPayments.filter(payment => payment.playerUUID === playerUUID);
            }
            if (currency) {
                allPayments = allPayments.filter(payment => payment.currency === currency);
            }

            // 時間範圍篩選
            if (timeRange !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (timeRange) {
                    case 'day':
                        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                }
                
                if (startDate) {
                    allPayments = allPayments.filter(payment => 
                        new Date(payment.createDate) >= startDate
                    );
                }
            }

            const stats = {
                totalPayments: allPayments.length,
                successfulPayments: allPayments.filter(p => p.result === 'success').length,
                failedPayments: allPayments.filter(p => p.result === 'failed').length,
                pendingPayments: allPayments.filter(p => p.result === 'pending').length,
                totalAmount: {
                    emerald: allPayments
                        .filter(p => p.currency === 'emerald' && p.result === 'success')
                        .reduce((sum, p) => sum + p.amount, 0),
                    coin: allPayments
                        .filter(p => p.currency === 'coin' && p.result === 'success')
                        .reduce((sum, p) => sum + p.amount, 0)
                },
                uniqueUsers: new Set(allPayments.map(p => p.playerUUID)).size,
                successRate: allPayments.length > 0 
                    ? ((allPayments.filter(p => p.result === 'success').length / allPayments.length) * 100).toFixed(2)
                    : 0
            };

            Logger.debug('[PaymentRepository.getPaymentStats] 獲取支付統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[PaymentRepository.getPaymentStats] 獲取支付統計失敗:', error);
            return null;
        }
    }

    /**
     * 獲取支付記錄 (分頁)
     * @param {Object} options - 查詢選項
     * @param {number} options.page - 頁數 (從 1 開始)
     * @param {number} options.limit - 每頁數量
     * @param {string} options.currency - 貨幣類型篩選 (可選)
     * @param {string} options.result - 結果篩選 (可選)
     * @returns {Promise<Object>} 分頁結果
     */
    async getPayments(options = {}) {
        try {
            const { page = 1, limit = 20, currency = null, result = null } = options;
            
            let allPayments = await databaseService.getRange(this.prefix);
            allPayments = Object.values(allPayments);

            // 應用篩選條件
            if (currency) {
                allPayments = allPayments.filter(payment => payment.currency === currency);
            }
            if (result) {
                allPayments = allPayments.filter(payment => payment.result === result);
            }

            // 按創建日期排序 (最新的在前)
            allPayments.sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            // 分頁計算
            const totalRecords = allPayments.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const payments = allPayments.slice(startIndex, endIndex);

            const result_obj = {
                payments,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalRecords,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

            Logger.debug(`[PaymentRepository.getPayments] 獲取第 ${page} 頁支付記錄 (${payments.length}/${totalRecords})`);
            return result_obj;
        } catch (error) {
            Logger.error('[PaymentRepository.getPayments] 獲取支付記錄失敗:', error);
            return { payments: [], pagination: null };
        }
    }

    /**
     * 刪除支付記錄
     * @param {string} payID - 支付 ID
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deletePayment(payID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${payID}`);
            if (success) {
                Logger.info(`[PaymentRepository.deletePayment] 刪除支付記錄: ${payID}`);
            } else {
                Logger.warn(`[PaymentRepository.deletePayment] 支付記錄不存在或刪除失敗: ${payID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[PaymentRepository.deletePayment] 刪除支付記錄失敗 (${payID}):`, error);
            return false;
        }
    }

    /**
     * 刪除用戶所有支付記錄
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<number>} 刪除的記錄數量
     */
    async deleteUserPayments(playerUUID) {
        try {
            const userPayments = await this.getUserPayments(playerUUID);
            let deletedCount = 0;
            
            for (const payment of userPayments) {
                const success = await this.deletePayment(payment.payID);
                if (success) {
                    deletedCount++;
                }
            }

            Logger.info(`[PaymentRepository.deleteUserPayments] 刪除用戶 ${playerUUID} 的 ${deletedCount} 筆支付記錄`);
            return deletedCount;
        } catch (error) {
            Logger.error(`[PaymentRepository.deleteUserPayments] 刪除用戶支付記錄失敗 (${playerUUID}):`, error);
            return 0;
        }
    }

    /**
     * 獲取特定時間範圍內的支付記錄
     * @param {string} startDate - 開始日期 (ISO 字符串)
     * @param {string} endDate - 結束日期 (ISO 字符串)
     * @returns {Promise<Object[]>} 支付記錄列表
     */
    async getPaymentsByDateRange(startDate, endDate) {
        try {
            const allPayments = await databaseService.getRange(this.prefix);
            const payments = Object.values(allPayments)
                .filter(payment => {
                    const paymentDate = new Date(payment.createDate);
                    return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
                })
                .sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            Logger.debug(`[PaymentRepository.getPaymentsByDateRange] 獲取 ${startDate} 到 ${endDate} 的 ${payments.length} 筆支付記錄`);
            return payments;
        } catch (error) {
            Logger.error(`[PaymentRepository.getPaymentsByDateRange] 獲取日期範圍支付記錄失敗:`, error);
            return [];
        }
    }
}

module.exports = PaymentRepository;