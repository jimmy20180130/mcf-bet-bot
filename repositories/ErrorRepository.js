const databaseService = require('../services/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 錯誤歷史記錄 Repository
 * 管理系統錯誤記錄，包含錯誤創建、查詢等功能
 * 
 * 資料格式:
 * - errorID: 錯誤唯一識別碼
 * - errorType: 錯誤類型 (PAYMENT_ERROR, BET_ERROR, SYSTEM_ERROR, etc.)
 * - errorMessage: 錯誤訊息
 * - playerUUID: 相關玩家 UUID (可為 null)
 * - time: 錯誤發生時間 (Unix timestamp)
 * - additionalInfo: 額外資訊 (JSON 物件)
 */
class ErrorRepository {
    constructor() {
        this.prefix = 'errorHistory:';
    }

    /**
     * 創建新錯誤記錄
     * @param {Object} errorData - 錯誤資料
     * @param {string} errorData.errorType - 錯誤類型
     * @param {string} errorData.errorMessage - 錯誤訊息
     * @param {string|null} errorData.playerUUID - 玩家 UUID (可選)
     * @param {Object} errorData.additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object|null>} 創建的錯誤記錄
     */
    async createError(errorData) {
        try {
            const { errorType, errorMessage, playerUUID = null, additionalInfo = {} } = errorData;

            if (!errorType || !errorMessage) {
                throw new Error('錯誤類型和錯誤訊息為必填欄位');
            }

            // 生成錯誤 ID (使用時間戳 + 隨機數)
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const generatedErrorID = `ERR_${timestamp}_${random}`;

            // 檢查是否已存在 (極小機率但仍需檢查)
            const existingError = await this.getErrorByID(generatedErrorID);
            if (existingError) {
                throw new Error(`錯誤記錄 ${generatedErrorID} 已存在`);
            }

            const error = {
                errorID: generatedErrorID,
                errorType,
                errorMessage,
                playerUUID,
                time: Math.floor(timestamp / 1000), // 轉換為秒級 Unix timestamp
                additionalInfo
            };

            const success = await databaseService.put(`${this.prefix}${generatedErrorID}`, error);
            if (success) {
                Logger.info(`[ErrorRepository.createError] 創建錯誤記錄: ${generatedErrorID} (${errorType}, ${playerUUID || 'N/A'})`);
                return error;
            }
            return null;
        } catch (error) {
            Logger.error(`[ErrorRepository.createError] 創建錯誤記錄失敗:`, error);
            return null;
        }
    }

    /**
     * 根據錯誤 ID 獲取錯誤記錄
     * @param {string} errorID - 錯誤 ID
     * @returns {Promise<Object|null>} 錯誤記錄
     */
    async getErrorByID(errorID) {
        try {
            const error = await databaseService.get(`${this.prefix}${errorID}`);
            if (error) {
                Logger.debug(`[ErrorRepository.getErrorByID] 找到錯誤記錄: ${errorID}`);
            }
            return error;
        } catch (error) {
            Logger.error(`[ErrorRepository.getErrorByID] 獲取錯誤記錄失敗 (${errorID}):`, error);
            return null;
        }
    }

    /**
     * 根據玩家 UUID 獲取錯誤記錄
     * @param {string} playerUUID - 玩家 UUID
     * @param {number} limit - 限制數量 (預設 50)
     * @returns {Promise<Object[]>} 錯誤記錄列表
     */
    async getErrorsByPlayerUUID(playerUUID, limit = 50) {
        try {
            const allErrors = await this.getAllErrors();
            const playerErrors = allErrors
                .filter(error => error.playerUUID === playerUUID)
                .sort((a, b) => b.time - a.time) // 按時間降序排列
                .slice(0, limit);

            Logger.debug(`[ErrorRepository.getErrorsByPlayerUUID] 找到 ${playerErrors.length} 個錯誤記錄 (${playerUUID})`);
            return playerErrors;
        } catch (error) {
            Logger.error(`[ErrorRepository.getErrorsByPlayerUUID] 獲取玩家錯誤記錄失敗 (${playerUUID}):`, error);
            return [];
        }
    }

    /**
     * 根據錯誤類型獲取錯誤記錄
     * @param {string} errorType - 錯誤類型
     * @param {number} limit - 限制數量 (預設 100)
     * @returns {Promise<Object[]>} 錯誤記錄列表
     */
    async getErrorsByType(errorType, limit = 100) {
        try {
            const allErrors = await this.getAllErrors();
            const typeErrors = allErrors
                .filter(error => error.errorType === errorType)
                .sort((a, b) => b.time - a.time) // 按時間降序排列
                .slice(0, limit);

            Logger.debug(`[ErrorRepository.getErrorsByType] 找到 ${typeErrors.length} 個 ${errorType} 類型錯誤記錄`);
            return typeErrors;
        } catch (error) {
            Logger.error(`[ErrorRepository.getErrorsByType] 獲取錯誤類型記錄失敗 (${errorType}):`, error);
            return [];
        }
    }

    /**
     * 根據時間範圍獲取錯誤記錄
     * @param {number} startTime - 開始時間 (Unix timestamp)
     * @param {number} endTime - 結束時間 (Unix timestamp)
     * @param {number} limit - 限制數量 (預設 100)
     * @returns {Promise<Object[]>} 錯誤記錄列表
     */
    async getErrorsByTimeRange(startTime, endTime, limit = 100) {
        try {
            const allErrors = await this.getAllErrors();
            const rangeErrors = allErrors
                .filter(error => error.time >= startTime && error.time <= endTime)
                .sort((a, b) => b.time - a.time) // 按時間降序排列
                .slice(0, limit);

            Logger.debug(`[ErrorRepository.getErrorsByTimeRange] 找到 ${rangeErrors.length} 個時間範圍內錯誤記錄`);
            return rangeErrors;
        } catch (error) {
            Logger.error(`[ErrorRepository.getErrorsByTimeRange] 獲取時間範圍錯誤記錄失敗:`, error);
            return [];
        }
    }

    /**
     * 獲取最近的錯誤記錄
     * @param {number} limit - 限制數量 (預設 50)
     * @returns {Promise<Object[]>} 錯誤記錄列表
     */
    async getRecentErrors(limit = 50) {
        try {
            const allErrors = await this.getAllErrors();
            const recentErrors = allErrors
                .sort((a, b) => b.time - a.time) // 按時間降序排列
                .slice(0, limit);

            Logger.debug(`[ErrorRepository.getRecentErrors] 獲取 ${recentErrors.length} 個最近錯誤記錄`);
            return recentErrors;
        } catch (error) {
            Logger.error(`[ErrorRepository.getRecentErrors] 獲取最近錯誤記錄失敗:`, error);
            return [];
        }
    }

    /**
     * 獲取所有錯誤記錄
     * @returns {Promise<Object[]>} 所有錯誤記錄
     */
    async getAllErrors() {
        try {
            const errorsData = await databaseService.getRange(this.prefix);
            const errors = Object.values(errorsData);
            Logger.debug(`[ErrorRepository.getAllErrors] 獲取 ${errors.length} 個錯誤記錄`);
            return errors;
        } catch (error) {
            Logger.error('[ErrorRepository.getAllErrors] 獲取所有錯誤記錄失敗:', error);
            return [];
        }
    }

    /**
     * 獲取錯誤統計資訊
     * @param {number} days - 統計天數 (預設 7)
     * @returns {Promise<Object>} 錯誤統計資訊
     */
    async getErrorStatistics(days = 7) {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = currentTime - (days * 24 * 60 * 60);
            
            const recentErrors = await this.getErrorsByTimeRange(startTime, currentTime, Number.MAX_SAFE_INTEGER);
            
            const statistics = {
                totalErrors: recentErrors.length,
                errorsByType: {},
                errorsByPlayer: {},
                dailyCount: {}
            };

            // 統計錯誤類型
            recentErrors.forEach(error => {
                statistics.errorsByType[error.errorType] = (statistics.errorsByType[error.errorType] || 0) + 1;
                
                if (error.playerUUID) {
                    statistics.errorsByPlayer[error.playerUUID] = (statistics.errorsByPlayer[error.playerUUID] || 0) + 1;
                }

                // 按日統計
                const date = new Date(error.time * 1000).toDateString();
                statistics.dailyCount[date] = (statistics.dailyCount[date] || 0) + 1;
            });

            Logger.debug(`[ErrorRepository.getErrorStatistics] 統計 ${days} 天內 ${recentErrors.length} 個錯誤記錄`);
            return statistics;
        } catch (error) {
            Logger.error(`[ErrorRepository.getErrorStatistics] 獲取錯誤統計失敗:`, error);
            return {
                totalErrors: 0,
                errorsByType: {},
                errorsByPlayer: {},
                dailyCount: {}
            };
        }
    }

    /**
     * 刪除錯誤記錄
     * @param {string} errorID - 錯誤 ID
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deleteError(errorID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${errorID}`);
            if (success) {
                Logger.info(`[ErrorRepository.deleteError] 成功刪除錯誤記錄: ${errorID}`);
            } else {
                Logger.warn(`[ErrorRepository.deleteError] 錯誤記錄不存在或刪除失敗: ${errorID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[ErrorRepository.deleteError] 刪除錯誤記錄失敗 (${errorID}):`, error);
            return false;
        }
    }

    /**
     * 清理舊的錯誤記錄
     * @param {number} days - 保留天數 (預設 30)
     * @returns {Promise<number>} 刪除的記錄數量
     */
    async cleanupOldErrors(days = 30) {
        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const cutoffTime = currentTime - (days * 24 * 60 * 60);
            
            const allErrors = await this.getAllErrors();
            const oldErrors = allErrors.filter(error => error.time < cutoffTime);
            
            let deletedCount = 0;
            for (const error of oldErrors) {
                const success = await this.deleteError(error.errorID);
                if (success) {
                    deletedCount++;
                }
            }

            Logger.info(`[ErrorRepository.cleanupOldErrors] 清理 ${deletedCount} 個超過 ${days} 天的錯誤記錄`);
            return deletedCount;
        } catch (error) {
            Logger.error(`[ErrorRepository.cleanupOldErrors] 清理舊錯誤記錄失敗:`, error);
            return 0;
        }
    }

    /**
     * 檢查錯誤記錄是否存在
     * @param {string} errorID - 錯誤 ID
     * @returns {Promise<boolean>} 錯誤記錄是否存在
     */
    async errorExists(errorID) {
        try {
            return await databaseService.exists(`${this.prefix}${errorID}`);
        } catch (error) {
            Logger.error(`[ErrorRepository.errorExists] 檢查錯誤記錄存在性失敗 (${errorID}):`, error);
            return false;
        }
    }
}

module.exports = ErrorRepository;