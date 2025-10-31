const { errorRepository } = require('../../repositories');
const Logger = require('../../utils/logger');
// TODO: 清理不必要的垃圾

class ErrorHistoryService {
    constructor() {
        this.errorRepository = errorRepository;
    }

    async init() {
        Logger.debug('[ErrorHistoryService.init] 初始化 ErrorHistoryService');
    }

    async cleanup() {
        Logger.debug('[ErrorHistoryService.cleanup] 清理 ErrorHistoryService');
    }

    /**
     * 記錄錯誤
     * @param {string} errorType - 錯誤類型
     * @param {string} errorMessage - 錯誤訊息
     * @param {string|null} playerUUID - 玩家 UUID (可選)
     * @param {Object} additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object>} 操作結果
     */
    async logError(errorType, errorMessage, playerUUID = null, additionalInfo = {}) {
        try {
            Logger.info(`[ErrorHistoryService.logError] 記錄錯誤: ${errorType} - ${errorMessage} (${playerUUID || 'N/A'})`);

            const errorData = {
                errorType,
                errorMessage,
                playerUUID,
                additionalInfo: {
                    ...additionalInfo,
                    loggedAt: new Date().toISOString(),
                    source: 'ErrorHistoryService'
                }
            };

            const errorRecord = await this.errorRepository.createError(errorData);
            if (errorRecord) {
                return {
                    success: true,
                    errorID: errorRecord.errorID,
                    message: '錯誤記錄已創建'
                };
            } else {
                return {
                    success: false,
                    message: '錯誤記錄創建失敗'
                };
            }
        } catch (error) {
            Logger.error(`[ErrorHistoryService.logError] 記錄錯誤失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤'
            };
        }
    }

    /**
     * 記錄支付錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {string|null} playerUUID - 玩家 UUID
     * @param {Object} paymentDetails - 支付詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logPaymentError(errorMessage, playerUUID = null, paymentDetails = {}) {
        return await this.logError('PAYMENT_ERROR', errorMessage, playerUUID, {
            paymentType: paymentDetails.type || null,
            amount: paymentDetails.amount || null,
            currency: paymentDetails.currency || null,
            reason: paymentDetails.reason || null,
            ...paymentDetails
        });
    }

    /**
     * 記錄下注錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {string|null} playerUUID - 玩家 UUID
     * @param {Object} betDetails - 下注詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logBetError(errorMessage, playerUUID = null, betDetails = {}) {
        return await this.logError('BET_ERROR', errorMessage, playerUUID, {
            odds: betDetails.odds || null,
            ...betDetails
        });
    }

    /**
     * 記錄系統錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {Object} systemDetails - 系統詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logSystemError(errorMessage, systemDetails = {}) {
        return await this.logError('SYSTEM_ERROR', errorMessage, null, {
            component: systemDetails.component || null,
            operation: systemDetails.operation || null,
            stackTrace: systemDetails.stackTrace || null,
            ...systemDetails
        });
    }

    /**
     * 記錄資料庫錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {Object} databaseDetails - 資料庫詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logDatabaseError(errorMessage, databaseDetails = {}) {
        return await this.logError('DATABASE_ERROR', errorMessage, null, {
            operation: databaseDetails.operation || null,
            table: databaseDetails.table || null,
            key: databaseDetails.key || null,
            ...databaseDetails
        });
    }

    /**
     * 記錄網路錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {Object} networkDetails - 網路詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logNetworkError(errorMessage, networkDetails = {}) {
        return await this.logError('NETWORK_ERROR', errorMessage, null, {
            host: networkDetails.host || null,
            port: networkDetails.port || null,
            timeout: networkDetails.timeout || null,
            ...networkDetails
        });
    }

    /**
     * 記錄 Discord 錯誤
     * @param {string} errorMessage - 錯誤訊息
     * @param {string|null} playerUUID - 玩家 UUID
     * @param {Object} discordDetails - Discord 詳情
     * @returns {Promise<Object>} 操作結果
     */
    async logDiscordError(errorMessage, playerUUID = null, discordDetails = {}) {
        return await this.logError('DISCORD_ERROR', errorMessage, playerUUID, {
            discordID: discordDetails.discordID || null,
            channel: discordDetails.channel || null,
            command: discordDetails.command || null,
            ...discordDetails
        });
    }

    /**
     * 清理舊錯誤記錄
     * @param {number} days - 保留天數
     * @returns {Promise<Object>} 操作結果
     */
    async cleanupOldErrors(days = 30) {
        try {
            Logger.info(`[ErrorHistoryService.cleanupOldErrors] 開始清理超過 ${days} 天的錯誤記錄`);
            
            const deletedCount = await this.errorRepository.cleanupOldErrors(days);
            
            return {
                success: true,
                deletedCount,
                message: `成功清理 ${deletedCount} 個舊錯誤記錄`
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.cleanupOldErrors] 清理舊錯誤記錄失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                deletedCount: 0
            };
        }
    }
}

const errorHistoryService = new ErrorHistoryService();
errorHistoryService.name = 'errorHistoryService';

module.exports = errorHistoryService;