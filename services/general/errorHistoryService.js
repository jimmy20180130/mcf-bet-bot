const { errorRepository } = require('../../repositories');
const Logger = require('../../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 錯誤歷史服務
 * 處理錯誤記錄相關的業務邏輯，提供錯誤記錄、查詢、統計等功能
 */
class ErrorHistoryService {
    constructor() {
        this.errorRepository = errorRepository;
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
     * 獲取玩家錯誤歷史
     * @param {string} playerUUID - 玩家 UUID
     * @param {number} limit - 限制數量
     * @returns {Promise<Object>} 操作結果
     */
    async getPlayerErrorHistory(playerUUID, limit = 50) {
        try {
            const errors = await this.errorRepository.getErrorsByPlayerUUID(playerUUID, limit);
            return {
                success: true,
                errors,
                count: errors.length
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.getPlayerErrorHistory] 獲取玩家錯誤歷史失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                errors: [],
                count: 0
            };
        }
    }

    /**
     * 獲取錯誤類型統計
     * @param {number} days - 統計天數
     * @returns {Promise<Object>} 操作結果
     */
    async getErrorTypeStatistics(days = 7) {
        try {
            const statistics = await this.errorRepository.getErrorStatistics(days);
            return {
                success: true,
                statistics,
                period: `${days} 天`
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.getErrorTypeStatistics] 獲取錯誤統計失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                statistics: null
            };
        }
    }

    /**
     * 獲取最近錯誤
     * @param {number} limit - 限制數量
     * @returns {Promise<Object>} 操作結果
     */
    async getRecentErrors(limit = 50) {
        try {
            const errors = await this.errorRepository.getRecentErrors(limit);
            return {
                success: true,
                errors,
                count: errors.length
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.getRecentErrors] 獲取最近錯誤失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                errors: [],
                count: 0
            };
        }
    }

    /**
     * 根據錯誤類型獲取錯誤
     * @param {string} errorType - 錯誤類型
     * @param {number} limit - 限制數量
     * @returns {Promise<Object>} 操作結果
     */
    async getErrorsByType(errorType, limit = 100) {
        try {
            const errors = await this.errorRepository.getErrorsByType(errorType, limit);
            return {
                success: true,
                errors,
                count: errors.length,
                errorType
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.getErrorsByType] 獲取錯誤類型記錄失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                errors: [],
                count: 0
            };
        }
    }

    /**
     * 搜尋錯誤記錄
     * @param {Object} searchCriteria - 搜尋條件
     * @param {string} searchCriteria.errorType - 錯誤類型 (可選)
     * @param {string} searchCriteria.playerUUID - 玩家 UUID (可選)
     * @param {number} searchCriteria.startTime - 開始時間 (可選)
     * @param {number} searchCriteria.endTime - 結束時間 (可選)
     * @param {string} searchCriteria.keyword - 關鍵字搜尋 (可選)
     * @param {number} limit - 限制數量
     * @returns {Promise<Object>} 操作結果
     */
    async searchErrors(searchCriteria, limit = 100) {
        try {
            let errors = await this.errorRepository.getAllErrors();

            // 根據條件過濾
            if (searchCriteria.errorType) {
                errors = errors.filter(error => error.errorType === searchCriteria.errorType);
            }

            if (searchCriteria.playerUUID) {
                errors = errors.filter(error => error.playerUUID === searchCriteria.playerUUID);
            }

            if (searchCriteria.startTime && searchCriteria.endTime) {
                errors = errors.filter(error => 
                    error.time >= searchCriteria.startTime && error.time <= searchCriteria.endTime
                );
            }

            if (searchCriteria.keyword) {
                const keyword = searchCriteria.keyword.toLowerCase();
                errors = errors.filter(error => 
                    error.errorMessage.toLowerCase().includes(keyword) ||
                    error.errorID.toLowerCase().includes(keyword)
                );
            }

            // 排序並限制數量
            errors = errors
                .sort((a, b) => b.time - a.time)
                .slice(0, limit);

            return {
                success: true,
                errors,
                count: errors.length,
                searchCriteria
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.searchErrors] 搜尋錯誤記錄失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                errors: [],
                count: 0
            };
        }
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

    /**
     * 獲取錯誤記錄詳情
     * @param {string} errorID - 錯誤 ID
     * @returns {Promise<Object>} 操作結果
     */
    async getErrorDetails(errorID) {
        try {
            const error = await this.errorRepository.getErrorByID(errorID);
            if (error) {
                return {
                    success: true,
                    error
                };
            } else {
                return {
                    success: false,
                    message: '錯誤記錄不存在'
                };
            }
        } catch (error) {
            Logger.error(`[ErrorHistoryService.getErrorDetails] 獲取錯誤詳情失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤'
            };
        }
    }

    /**
     * 格式化錯誤訊息用於顯示
     * @param {Object} error - 錯誤記錄
     * @returns {string} 格式化的錯誤訊息
     */
    formatErrorMessage(error) {
        const timestamp = new Date(error.time * 1000).toLocaleString('zh-TW');
        const playerInfo = error.playerUUID ? ` (玩家: ${error.playerUUID})` : '';
        
        return `[${timestamp}] ${error.errorType}: ${error.errorMessage}${playerInfo} (ID: ${error.errorID})`;
    }

    /**
     * 批量記錄錯誤 (用於系統遷移或批量處理)
     * @param {Array} errorDataArray - 錯誤資料陣列
     * @returns {Promise<Object>} 操作結果
     */
    async batchLogErrors(errorDataArray) {
        try {
            let successCount = 0;
            let failureCount = 0;
            const results = [];

            for (const errorData of errorDataArray) {
                const result = await this.logError(
                    errorData.errorType,
                    errorData.errorMessage,
                    errorData.playerUUID,
                    errorData.additionalInfo
                );

                results.push(result);
                if (result.success) {
                    successCount++;
                } else {
                    failureCount++;
                }
            }

            Logger.info(`[ErrorHistoryService.batchLogErrors] 批量記錄完成: 成功 ${successCount}, 失敗 ${failureCount}`);

            return {
                success: true,
                successCount,
                failureCount,
                totalCount: errorDataArray.length,
                results
            };
        } catch (error) {
            Logger.error(`[ErrorHistoryService.batchLogErrors] 批量記錄錯誤失敗:`, error);
            return {
                success: false,
                message: error.message || '系統錯誤',
                successCount: 0,
                failureCount: 0,
                totalCount: 0
            };
        }
    }
}

module.exports = new ErrorHistoryService();