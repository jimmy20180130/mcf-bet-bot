const databaseService = require('../services/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 等級資料 Repository
 * 管理等級設定，包含等級獎勵、前綴等資訊
 * 
 * 資料格式:
 * - rankID: 等級唯一識別碼
 * - rankName: 等級名稱
 * - dailyReward: 每日獎勵 (JSON 物件: {"emerald": amount, "coin": amount})
 * - discordID: Discord 身分組 ID (可為 null)
 * - prefix: 等級前綴 (可為 null)
 */
class RankRepository {
    constructor() {
        this.prefix = 'rank:';
    }

    /**
     * 創建新等級
     * @param {Object} rankData - 等級資料
     * @param {string} rankData.rankID - 等級 ID
     * @param {string} rankData.rankName - 等級名稱
     * @param {Object} rankData.dailyReward - 每日獎勵 {"emerald": number, "coin": number}
     * @param {string} [rankData.description] - 等級描述 (可選)
     * @param {number} [rankData.bonusOdds] - 下注加成賠率 (可選，預設 0)
     * @param {string|null} rankData.discordID - Discord 身分組 ID (可選)
     * @param {string|null} rankData.prefix - 等級前綴 (可選)
     * @returns {Promise<boolean>} 是否創建成功
     */
    async createRank(rankData) {
        try {
            const { rankID, rankName, dailyReward, description = '無', discordID = null, prefix = null, bonusOdds = 0 } = rankData;

            if (!rankID || !rankName) {
                throw new Error('rankID 和 rankName 為必填欄位');
            }

            if (!dailyReward || typeof dailyReward !== 'object') {
                throw new Error('dailyReward 必須是物件格式');
            }

            // 檢查等級是否已存在
            const existingRank = await this.getRankByID(rankID);
            if (existingRank) {
                throw new Error(`等級 ${rankID} 已存在`);
            }

            const rank = {
                rankID,
                rankName,
                description,
                dailyReward: {
                    emerald: dailyReward.emerald || 0,
                    coin: dailyReward.coin || 0
                },
                discordID,
                prefix,
                bonusOdds
            };

            const success = await databaseService.put(`${this.prefix}${rankID}`, rank);
            if (success) {
                Logger.info(`[RankRepository.createRank] 成功創建等級: ${rankID} (${rankName})`);
            }
            return success;
        } catch (error) {
            Logger.error(`[RankRepository.createRank] 創建等級失敗:`, error);
            return false;
        }
    }

    /**
     * 根據等級 ID 獲取等級資料
     * @param {string} rankID - 等級 ID
     * @returns {Promise<Object|null>} 等級資料
     */
    async getRankByID(rankID) {
        try {
            const rank = await databaseService.get(`${this.prefix}${rankID}`);
            if (rank) {
                Logger.debug(`[RankRepository.getRankByID] 找到等級: ${rankID}`);
            }
            return rank;
        } catch (error) {
            Logger.error(`[RankRepository.getRankByID] 獲取等級失敗 (${rankID}):`, error);
            return null;
        }
    }

    /**
     * 根據等級名稱獲取等級資料
     * @param {string} rankName - 等級名稱
     * @returns {Promise<Object|null>} 等級資料
     */
    async getRankByName(rankName) {
        try {
            const allRanks = await databaseService.getRange(this.prefix);
            for (const rank of Object.values(allRanks)) {
                if (rank.rankName === rankName) {
                    Logger.debug(`[RankRepository.getRankByName] 找到等級: ${rankName} (ID: ${rank.rankID})`);
                    return rank;
                }
            }
            Logger.debug(`[RankRepository.getRankByName] 等級不存在: ${rankName}`);
            return null;
        } catch (error) {
            Logger.error(`[RankRepository.getRankByName] 獲取等級失敗 (${rankName}):`, error);
            return null;
        }
    }

    /**
     * 根據 Discord ID 獲取等級資料
     * @param {string} discordID - Discord 身分組 ID
     * @returns {Promise<Object|null>} 等級資料
     */
    async getRankByDiscordID(discordID) {
        try {
            const allRanks = await databaseService.getRange(this.prefix);
            for (const rank of Object.values(allRanks)) {
                if (rank.discordID === discordID) {
                    Logger.debug(`[RankRepository.getRankByDiscordID] 找到等級: ${discordID} (ID: ${rank.rankID})`);
                    return rank;
                }
            }
            Logger.debug(`[RankRepository.getRankByDiscordID] 等級不存在: ${discordID}`);
            return null;
        } catch (error) {
            Logger.error(`[RankRepository.getRankByDiscordID] 獲取等級失敗 (${discordID}):`, error);
            return null;
        }
    }

    /**
     * 更新等級資料
     * @param {string} rankID - 等級 ID
     * @param {Object} updateData - 要更新的資料
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updateRank(rankID, updateData) {
        try {
            const existingRank = await this.getRankByID(rankID);
            if (!existingRank) {
                throw new Error(`等級 ${rankID} 不存在`);
            }

            const updatedRank = {
                ...existingRank,
                ...updateData,
                rankID, // 確保 ID 不被更改
                dailyReward: {
                    ...existingRank.dailyReward,
                    ...(updateData.dailyReward || {})
                }
            };

            const success = await databaseService.put(`${this.prefix}${rankID}`, updatedRank);
            if (success) {
                Logger.info(`[RankRepository.updateRank] 成功更新等級: ${rankID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[RankRepository.updateRank] 更新等級失敗 (${rankID}):`, error);
            return false;
        }
    }

    /**
     * 獲取所有等級
     * @returns {Promise<Object[]>} 所有等級資料
     */
    async getAllRanks() {
        try {
            const ranksData = await databaseService.getRange(this.prefix);
            const ranks = Object.values(ranksData);
            Logger.debug(`[RankRepository.getAllRanks] 獲取 ${ranks.length} 個等級`);
            return ranks;
        } catch (error) {
            Logger.error('[RankRepository.getAllRanks] 獲取所有等級失敗:', error);
            return [];
        }
    }

    /**
     * 刪除等級
     * @param {string} rankID - 等級 ID
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deleteRank(rankID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${rankID}`);
            if (success) {
                Logger.info(`[RankRepository.deleteRank] 成功刪除等級: ${rankID}`);
            } else {
                Logger.warn(`[RankRepository.deleteRank] 等級不存在或刪除失敗: ${rankID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[RankRepository.deleteRank] 刪除等級失敗 (${rankID}):`, error);
            return false;
        }
    }

    /**
     * 檢查等級是否存在
     * @param {string} rankID - 等級 ID
     * @returns {Promise<boolean>} 等級是否存在
     */
    async rankExists(rankID) {
        try {
            return await databaseService.exists(`${this.prefix}${rankID}`);
        } catch (error) {
            Logger.error(`[RankRepository.rankExists] 檢查等級存在性失敗 (${rankID}):`, error);
            return false;
        }
    }

    /**
     * 獲取等級統計資訊
     * @returns {Promise<Object>} 等級統計資訊
     */
    async getRankStats() {
        try {
            const ranks = await this.getAllRanks();
            const stats = {
                totalRanks: ranks.length,
                ranksWithDiscord: ranks.filter(r => r.discordID).length,
                ranksWithPrefix: ranks.filter(r => r.prefix).length,
                totalEmeraldRewards: ranks.reduce((sum, r) => sum + (r.dailyReward?.emerald || 0), 0),
                totalCoinRewards: ranks.reduce((sum, r) => sum + (r.dailyReward?.coin || 0), 0)
            };
            Logger.debug('[RankRepository.getRankStats] 獲取等級統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[RankRepository.getRankStats] 獲取等級統計失敗:', error);
            return null;
        }
    }

    // TODO: fix or delete
    /**
     * 根據獎勵金額排序等級
     * @param {string} rewardType - 獎勵類型 ('emerald' 或 'coin')
     * @param {string} order - 排序方式 ('asc' 或 'desc')
     * @returns {Promise<Object[]>} 排序後的等級列表
     */
    async getRanksSortedByReward(rewardType = 'emerald', order = 'desc') {
        try {
            const ranks = await this.getAllRanks();
            if (!['emerald', 'coin'].includes(rewardType)) {
                throw new Error('獎勵類型必須是 emerald 或 coin');
            }

            ranks.sort((a, b) => {
                const aReward = a.dailyReward?.[rewardType] || 0;
                const bReward = b.dailyReward?.[rewardType] || 0;
                return order === 'asc' ? aReward - bReward : bReward - aReward;
            });

            Logger.debug(`[RankRepository.getRanksSortedByReward] 按 ${rewardType} 獎勵排序 (${order})`);
            return ranks;
        } catch (error) {
            Logger.error(`[RankRepository.getRanksSortedByReward] 排序等級失敗:`, error);
            return [];
        }
    }
}

module.exports = RankRepository;