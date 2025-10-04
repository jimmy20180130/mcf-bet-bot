const databaseService = require('../services/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 每日簽到記錄 Repository
 * 管理用戶每日簽到資料
 * 
 * 資料格式:
 * - playerUUID: 玩家唯一識別碼
 * - claimDate: 簽到日期 (YYYY-MM-DD 格式)
 */
class DailyRepository {
    constructor() {
        this.prefix = 'daily:';
    }

    /**
     * 記錄用戶簽到
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} date - 簽到日期 (可選，預設為今天，格式: YYYY-MM-DD)
     * @returns {Promise<boolean>} 是否簽到成功
     */
    async claimDaily(playerUUID, date = null) {
        try {
            if (!playerUUID) {
                throw new Error('playerUUID 為必填欄位');
            }

            const claimDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const recordKey = `${this.prefix}${playerUUID}:${claimDate}`;

            // 檢查是否已經簽到
            // TODO: use this.hasClaimedToday
            const existingClaim = await databaseService.get(recordKey);
            if (existingClaim) {
                throw new Error(`用戶 ${playerUUID} 在 ${claimDate} 已經簽到過了`);
            }

            // TODO: 新增當時的簽到 rank 以及金額
            const claimRecord = {
                playerUUID,
                claimDate,
                timestamp: new Date().toISOString()
            };

            const success = await databaseService.put(recordKey, claimRecord);
            if (success) {
                Logger.info(`[DailyRepository.claimDaily] 用戶 ${playerUUID} 完成 ${claimDate} 簽到`);
            }

            // TODO: return ConsecutiveDays
            return success;
        } catch (error) {
            Logger.error(`[DailyRepository.claimDaily] 簽到失敗 (${playerUUID}):`, error);
            return false;
        }
    }

    /**
     * 檢查用戶今日是否已簽到
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} date - 檢查日期 (可選，預設為今天，格式: YYYY-MM-DD)
     * @returns {Promise<boolean>} 是否已簽到
     */
    async hasClaimedToday(playerUUID, date = null) {
        try {
            const claimDate = date || new Date().toISOString().split('T')[0];
            const recordKey = `${this.prefix}${playerUUID}:${claimDate}`;
            
            const exists = await databaseService.exists(recordKey);
            Logger.debug(`[DailyRepository.hasClaimedToday] 用戶 ${playerUUID} 在 ${claimDate} ${exists ? '已' : '未'}簽到`);
            return exists;
        } catch (error) {
            Logger.error(`[DailyRepository.hasClaimedToday] 檢查簽到狀態失敗 (${playerUUID}):`, error);
            return false;
        }
    }

    /**
     * 獲取用戶簽到記錄
     * @param {string} playerUUID - 玩家 UUID
     * @param {number} days - 獲取最近幾天的記錄 (可選，預設 30 天)
     * @returns {Promise<Object[]>} 簽到記錄列表
     */
    async getUserClaimHistory(playerUUID, days = 30) {
        try {
            const prefix = `${this.prefix}${playerUUID}:`;
            const allClaims = await databaseService.getRange(prefix);
            
            // 按日期排序，最新的在前
            const claims = Object.values(allClaims)
                .sort((a, b) => new Date(b.claimDate) - new Date(a.claimDate))
                .slice(0, days);

            Logger.debug(`[DailyRepository.getUserClaimHistory] 獲取用戶 ${playerUUID} 最近 ${claims.length} 天簽到記錄`);
            return claims;
        } catch (error) {
            Logger.error(`[DailyRepository.getUserClaimHistory] 獲取簽到記錄失敗 (${playerUUID}):`, error);
            return [];
        }
    }

    /**
     * 獲取用戶連續簽到天數
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<number>} 連續簽到天數
     */
    async getConsecutiveDays(playerUUID) {
        try {
            const claims = await this.getUserClaimHistory(playerUUID, 365); // 獲取一年內的記錄
            if (claims.length === 0) {
                return 0;
            }

            let consecutiveDays = 0;
            const today = new Date().toISOString().split('T')[0];
            let checkDate = new Date(today);

            // 從今天開始往前檢查
            for (let i = 0; i < claims.length; i++) {
                const checkDateStr = checkDate.toISOString().split('T')[0];
                const hasClaimed = claims.some(claim => claim.claimDate === checkDateStr);
                
                if (hasClaimed) {
                    consecutiveDays++;
                    checkDate.setDate(checkDate.getDate() - 1); // 往前一天
                } else {
                    // 如果是今天沒簽到，繼續檢查昨天
                    if (checkDateStr === today) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        continue;
                    } else {
                        break; // 連續記錄中斷
                    }
                }
            }

            Logger.debug(`[DailyRepository.getConsecutiveDays] 用戶 ${playerUUID} 連續簽到 ${consecutiveDays} 天`);
            return consecutiveDays;
        } catch (error) {
            Logger.error(`[DailyRepository.getConsecutiveDays] 計算連續簽到天數失敗 (${playerUUID}):`, error);
            return 0;
        }
    }

    /**
     * 獲取指定日期的所有簽到記錄
     * @param {string} date - 日期 (格式: YYYY-MM-DD)
     * @returns {Promise<Object[]>} 該日期的所有簽到記錄
     */
    async getClaimsByDate(date) {
        try {
            const allClaims = await databaseService.getRange(this.prefix);
            const dateClaims = Object.values(allClaims)
                .filter(claim => claim.claimDate === date);

            Logger.debug(`[DailyRepository.getClaimsByDate] ${date} 共有 ${dateClaims.length} 人簽到`);
            return dateClaims;
        } catch (error) {
            Logger.error(`[DailyRepository.getClaimsByDate] 獲取日期簽到記錄失敗 (${date}):`, error);
            return [];
        }
    }

    /**
     * 獲取用戶總簽到天數
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<number>} 總簽到天數
     */
    async getTotalClaimDays(playerUUID) {
        try {
            const claims = await this.getUserClaimHistory(playerUUID, Number.MAX_SAFE_INTEGER);
            Logger.debug(`[DailyRepository.getTotalClaimDays] 用戶 ${playerUUID} 總共簽到 ${claims.length} 天`);
            return claims.length;
        } catch (error) {
            Logger.error(`[DailyRepository.getTotalClaimDays] 獲取總簽到天數失敗 (${playerUUID}):`, error);
            return 0;
        }
    }

    /**
     * 刪除用戶簽到記錄
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} date - 日期 (格式: YYYY-MM-DD)
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deleteClaim(playerUUID, date) {
        try {
            const recordKey = `${this.prefix}${playerUUID}:${date}`;
            const success = await databaseService.remove(recordKey);
            
            if (success) {
                Logger.info(`[DailyRepository.deleteClaim] 刪除用戶 ${playerUUID} 在 ${date} 的簽到記錄`);
            } else {
                Logger.warn(`[DailyRepository.deleteClaim] 簽到記錄不存在或刪除失敗: ${playerUUID}:${date}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[DailyRepository.deleteClaim] 刪除簽到記錄失敗 (${playerUUID}:${date}):`, error);
            return false;
        }
    }

    /**
     * 刪除用戶所有簽到記錄
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<number>} 刪除的記錄數量
     */
    async deleteAllUserClaims(playerUUID) {
        try {
            const prefix = `${this.prefix}${playerUUID}:`;
            const userClaims = await databaseService.getKeys(prefix);
            
            let deletedCount = 0;
            for (const key of userClaims) {
                const success = await databaseService.remove(key);
                if (success) {
                    deletedCount++;
                }
            }

            Logger.info(`[DailyRepository.deleteAllUserClaims] 刪除用戶 ${playerUUID} 的 ${deletedCount} 筆簽到記錄`);
            return deletedCount;
        } catch (error) {
            Logger.error(`[DailyRepository.deleteAllUserClaims] 刪除用戶簽到記錄失敗 (${playerUUID}):`, error);
            return 0;
        }
    }

    /**
     * 獲取簽到統計資訊
     * @returns {Promise<Object>} 簽到統計資訊
     */
    async getClaimStats() {
        try {
            const allClaims = await databaseService.getRange(this.prefix);
            const claims = Object.values(allClaims);
            
            const today = new Date().toISOString().split('T')[0];
            const todayClaims = claims.filter(claim => claim.claimDate === today);
            
            const uniqueUsers = new Set(claims.map(claim => claim.playerUUID));
            
            const stats = {
                totalClaims: claims.length,
                uniqueUsers: uniqueUsers.size,
                todayClaims: todayClaims.length,
                averageClaimsPerUser: uniqueUsers.size > 0 ? (claims.length / uniqueUsers.size).toFixed(2) : 0
            };

            Logger.debug('[DailyRepository.getClaimStats] 獲取簽到統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[DailyRepository.getClaimStats] 獲取簽到統計失敗:', error);
            return null;
        }
    }

    /**
     * 獲取排行榜 (按連續簽到天數)
     * @param {number} limit - 限制數量 (預設 10)
     * @returns {Promise<Object[]>} 排行榜
     */
    async getLeaderboard(limit = 10) {
        try {
            const allClaims = await databaseService.getRange(this.prefix);
            const claims = Object.values(allClaims);
            
            // 獲取所有唯一用戶
            const uniqueUsers = [...new Set(claims.map(claim => claim.playerUUID))];
            
            // 計算每個用戶的連續簽到天數
            const leaderboard = [];
            for (const playerUUID of uniqueUsers) {
                const consecutiveDays = await this.getConsecutiveDays(playerUUID);
                const totalDays = await this.getTotalClaimDays(playerUUID);
                
                leaderboard.push({
                    playerUUID,
                    consecutiveDays,
                    totalDays
                });
            }
            
            // 按連續簽到天數排序
            const sortedLeaderboard = leaderboard
                .sort((a, b) => b.consecutiveDays - a.consecutiveDays)
                .slice(0, limit);

            Logger.debug(`[DailyRepository.getLeaderboard] 獲取前 ${sortedLeaderboard.length} 名簽到排行榜`);
            return sortedLeaderboard;
        } catch (error) {
            Logger.error('[DailyRepository.getLeaderboard] 獲取簽到排行榜失敗:', error);
            return [];
        }
    }
}

module.exports = DailyRepository;