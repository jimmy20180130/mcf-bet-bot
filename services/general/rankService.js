const { repositories } = require('../../repositories');
const Logger = require('../../utils/logger');
const { DatabaseError, ValidationError } = require('../../utils/errors');
// TODO: 清理不必要的垃圾
/**
 * 等級管理服務
 * 處理等級相關的業務邏輯，包含等級分配、獎勵計算等
 */
class RankService {
    constructor() {
        this.rankRepository = repositories.rank;
        this.userRepository = repositories.user;
    }

    /**
     * 創建新等級
     * @param {Object} rankData - 等級資料
     * @param {string} rankData.rankID - 等級 ID
     * @param {string} rankData.rankName - 等級名稱
     * @param {Object} rankData.dailyReward - 每日獎勵
     * @param {string|null} rankData.discordID - Discord 身分組 ID
     * @param {string|null} rankData.prefix - 等級前綴
     * @returns {Promise<Object>} 創建結果
     */
    async createRank(rankData) {
        Logger.info(`[RankService.createRank] 嘗試創建等級: ${rankData.rankID}`);

        // 驗證必要欄位
        if (!rankData.rankID || !rankData.rankName) {
            throw new ValidationError('等級 ID 和名稱為必填欄位');
        }

        // 驗證獎勵格式
        if (!rankData.dailyReward || typeof rankData.dailyReward !== 'object') {
            throw new ValidationError('每日獎勵必須是物件格式', 'dailyReward');
        }

        // 檢查 ID 重複
        const existingRank = await this.rankRepository.getRankByID(rankData.rankID);
        if (existingRank) {
            throw DatabaseError.alreadyExists('等級', rankData.rankID);
        }

        // 檢查名稱重複
        const existingName = await this.rankRepository.getRankByName(rankData.rankName);
        if (existingName) {
            throw DatabaseError.alreadyExists('等級名稱', rankData.rankName);
        }

        const success = await this.rankRepository.createRank(rankData);
        
        if (!success) {
            throw DatabaseError.updateFailed('等級', rankData.rankID);
        }

        Logger.info(`[RankService.createRank] 成功創建等級: ${rankData.rankID} (${rankData.rankName})`);
        return rankData;
    }

    /**
     * 獲取等級資料
     * @param {string} identifier - 等級 ID 或名稱
     * @returns {Promise<Object|null>} 等級資料
     */
    async getRank(identifier) {
        // 先嘗試用 ID 查找
        let rank = await this.rankRepository.getRankByID(identifier);
        
        // 如果找不到，再用名稱查找
        if (!rank) {
            rank = await this.rankRepository.getRankByName(identifier);
        }

        if (rank) {
            Logger.debug(`[RankService.getRank] 找到等級: ${identifier}`);
        } else {
            Logger.debug(`[RankService.getRank] 等級不存在: ${identifier}`);
        }

        return rank;
    }

    /**
     * 設置用戶等級
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} rankID - 等級 ID
     * @returns {Promise<Object>} 設置結果
     */
    async setUserRank(playerUUID, rankID) {
        Logger.info(`[RankService.setUserRank] 設置用戶等級: ${playerUUID} -> ${rankID}`);

        // 檢查用戶是否存在
        const user = await this.userRepository.getUserByUUID(playerUUID);
        if (!user) {
            throw DatabaseError.notFound('用戶', playerUUID);
        }

        // 檢查等級是否存在
        const rank = await this.rankRepository.getRankByID(rankID);
        if (!rank) {
            throw DatabaseError.notFound('等級', rankID);
        }

        // 更新用戶等級
        const updatedUser = await this.userRepository.updateUser(playerUUID, {
            additionalInfo: {
                ...user.additionalInfo,
                rank: rankID,
                rankSetTime: Math.floor(Date.now() / 1000)
            }
        });

        Logger.info(`[RankService.setUserRank] 成功設置用戶 ${playerUUID} 等級為 ${rank.rankName}`);
        return { user: updatedUser, rank };
    }

    /**
     * 移除用戶等級
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<Object>} 移除結果
     */
    async removeUserRank(playerUUID) {
        Logger.info(`[RankService.removeUserRank] 移除用戶等級: ${playerUUID}`);

        // 檢查用戶是否存在
        const user = await this.userRepository.getUserByUUID(playerUUID);
        if (!user) {
            throw DatabaseError.notFound('用戶', playerUUID);
        }

        // 更新用戶等級為 null
        const updatedUser = await this.userRepository.updateUser(playerUUID, {
            additionalInfo: {
                ...user.additionalInfo,
                rank: null,
                rankRemovedTime: Math.floor(Date.now() / 1000)
            }
        });

        Logger.info(`[RankService.removeUserRank] 成功移除用戶 ${playerUUID} 的等級`);
        return updatedUser;
    }

    /**
     * 獲取用戶等級資料
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<Object|null>} 用戶等級資料
     */
    async getUserRank(playerUUID) {
        const user = await this.userRepository.getUserByUUID(playerUUID);
        if (!user) {
            return null;
        }

        const userRankID = user.additionalInfo?.rank;
        if (!userRankID) {
            return {
                user: user,
                rank: null,
                hasRank: false
            };
        }

        const rank = await this.rankRepository.getRankByID(userRankID);
        return {
            user: user,
            rank: rank,
            hasRank: !!rank
        };
    }

    /**
     * 計算用戶每日獎勵
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<Object>} 獎勵資料
     */
    async calculateDailyReward(playerUUID) {
        try {
            const userRankData = await this.getUserRank(playerUUID);
            
            if (!userRankData || !userRankData.hasRank) {
                return {
                    hasReward: false,
                    emerald: 0,
                    coin: 0,
                    rankName: null
                };
            }

            const { rank } = userRankData;
            const dailyReward = rank.dailyReward || { emerald: 0, coin: 0 };

            return {
                hasReward: true,
                emerald: dailyReward.emerald || 0,
                coin: dailyReward.coin || 0,
                rankName: rank.rankName,
                rankID: rank.rankID
            };

        } catch (error) {
            Logger.error(`[RankService.calculateDailyReward] 計算每日獎勵失敗 (${playerUUID}):`, error);
            return {
                hasReward: false,
                emerald: 0,
                coin: 0,
                rankName: null
            };
        }
    }

    /**
     * 獲取所有等級列表
     * @param {Object} options - 查詢選項
     * @param {boolean} options.sortByReward - 是否按獎勵排序
     * @param {string} options.rewardType - 獎勵類型 ('emerald' 或 'coin')
     * @param {string} options.order - 排序方式 ('asc' 或 'desc')
     * @returns {Promise<Object[]>} 等級列表
     */
    async getAllRanks(options = {}) {
        try {
            const { sortByReward = false, rewardType = 'emerald', order = 'desc' } = options;

            let ranks;
            if (sortByReward) {
                ranks = await this.rankRepository.getRanksSortedByReward(rewardType, order);
            } else {
                ranks = await this.rankRepository.getAllRanks();
            }

            Logger.debug(`[RankService.getAllRanks] 獲取 ${ranks.length} 個等級`);
            return ranks;

        } catch (error) {
            Logger.error('[RankService.getAllRanks] 獲取等級列表失敗:', error);
            return [];
        }
    }

    /**
     * 獲取指定等級的所有用戶
     * @param {string} rankID - 等級 ID
     * @returns {Promise<Object[]>} 用戶列表
     */
    async getUsersByRank(rankID) {
        try {
            const allUsers = await this.userRepository.getAllUsers();
            const usersWithRank = allUsers.filter(user => 
                user.additionalInfo?.rank === rankID
            );

            Logger.debug(`[RankService.getUsersByRank] 等級 ${rankID} 有 ${usersWithRank.length} 個用戶`);
            return usersWithRank;

        } catch (error) {
            Logger.error(`[RankService.getUsersByRank] 獲取等級用戶失敗 (${rankID}):`, error);
            return [];
        }
    }

    /**
     * 更新等級資料
     * @param {string} rankID - 等級 ID
     * @param {Object} updateData - 更新資料
     * @returns {Promise<Object>} 更新結果
     */
    async updateRank(rankID, updateData) {
        Logger.info(`[RankService.updateRank] 更新等級: ${rankID}`);

        // 檢查等級是否存在
        const existingRank = await this.rankRepository.getRankByID(rankID);
        if (!existingRank) {
            throw DatabaseError.notFound('等級', rankID);
        }

        // 如果更新名稱，檢查是否重複
        if (updateData.rankName && updateData.rankName !== existingRank.rankName) {
            const duplicateName = await this.rankRepository.getRankByName(updateData.rankName);
            if (duplicateName) {
                throw DatabaseError.alreadyExists('等級名稱', updateData.rankName);
            }
        }

        const success = await this.rankRepository.updateRank(rankID, updateData);
        
        if (!success) {
            throw DatabaseError.updateFailed('等級', rankID);
        }

        const updatedRank = await this.rankRepository.getRankByID(rankID);
        Logger.info(`[RankService.updateRank] 成功更新等級: ${rankID}`);
        return updatedRank;
    }

    /**
     * 刪除等級
     * @param {string} rankID - 等級 ID
     * @returns {Promise<Object>} 刪除結果
     */
    async deleteRank(rankID) {
        Logger.info(`[RankService.deleteRank] 刪除等級: ${rankID}`);

        // 檢查等級是否存在
        const existingRank = await this.rankRepository.getRankByID(rankID);
        if (!existingRank) {
            throw DatabaseError.notFound('等級', rankID);
        }

        // 檢查是否有用戶使用此等級
        const usersWithRank = await this.getUsersByRank(rankID);
        if (usersWithRank.length > 0) {
            throw new ValidationError(
                `無法刪除等級 ${existingRank.rankName}，還有 ${usersWithRank.length} 個用戶使用此等級`,
                'rankID'
            );
        }

        const success = await this.rankRepository.deleteRank(rankID);
        
        if (!success) {
            throw DatabaseError.deleteFailed('等級', rankID);
        }

        Logger.info(`[RankService.deleteRank] 成功刪除等級: ${rankID}`);
        return existingRank;
    }

    /**
     * 獲取等級統計資訊
     * @returns {Promise<Object>} 統計資訊
     */
    async getRankStatistics() {
        try {
            const rankStats = await this.rankRepository.getRankStats();
            const allUsers = await this.userRepository.getAllUsers();
            
            // 計算用戶等級分布
            const userRankDistribution = {};
            let usersWithRank = 0;
            
            allUsers.forEach(user => {
                const userRank = user.additionalInfo?.rank;
                if (userRank) {
                    usersWithRank++;
                    userRankDistribution[userRank] = (userRankDistribution[userRank] || 0) + 1;
                }
            });

            const statistics = {
                ...rankStats,
                totalUsers: allUsers.length,
                usersWithRank: usersWithRank,
                usersWithoutRank: allUsers.length - usersWithRank,
                userRankDistribution: userRankDistribution
            };

            Logger.debug('[RankService.getRankStatistics] 獲取等級統計資訊');
            return statistics;

        } catch (error) {
            Logger.error('[RankService.getRankStatistics] 獲取等級統計失敗:', error);
            return null;
        }
    }

    /**
     * 批量設置用戶等級
     * @param {Array} assignments - 等級分配列表 [{ playerUUID, rankID }, ...]
     * @returns {Promise<Object>} 批量設置結果
     */
    async batchSetUserRanks(assignments) {
        try {
            Logger.info(`[RankService.batchSetUserRanks] 批量設置 ${assignments.length} 個用戶等級`);

            const results = {
                total: assignments.length,
                success: 0,
                failed: 0,
                details: []
            };

            for (const assignment of assignments) {
                const result = await this.setUserRank(assignment.playerUUID, assignment.rankID);
                results.details.push({
                    playerUUID: assignment.playerUUID,
                    rankID: assignment.rankID,
                    ...result
                });

                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                }
            }

            Logger.info(`[RankService.batchSetUserRanks] 批量設置完成: 成功 ${results.success}，失敗 ${results.failed}`);
            return results;

        } catch (error) {
            Logger.error('[RankService.batchSetUserRanks] 批量設置失敗:', error);
            return {
                total: assignments.length,
                success: 0,
                failed: assignments.length,
                details: [],
                error: error.message
            };
        }
    }
}

module.exports = new RankService();