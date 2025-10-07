const databaseService = require('../services/general/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾

/**
 * 下注記錄 Repository
 * 管理所有下注記錄
 * 
 * 資料格式:
 * - betID: 下注唯一識別碼
 * - playerUUID: 玩家唯一識別碼
 * - betType: 下注類型
 * - amount: 下注金額
 * - odds: 賠率
 * - result: 下注結果 ('win', 'lose')
 * - additionalInfo: 額外資訊 (JSON 物件)
 * - createDate: 下注創建日期
 */
class BetRepository {
    constructor() {
        this.prefix = 'betRecord:';
    }

    /**
     * 生成下注 ID
     * @returns {string} 唯一的下注 ID
     */
    generateBetID() {
        return `bet_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * 創建下注記錄
     * @param {Object} betData - 下注資料
     * @param {string} betData.playerUUID - 玩家 UUID
     * @param {string} betData.betType - 下注類型
     * @param {number} betData.amount - 下注金額
     * @param {number} betData.odds - 賠率
     * @param {string} betData.result - 下注結果 ('win', 'lose')
     * @param {string} betData.betID - 下注 ID (可選，會自動生成)
     * @param {Object} betData.additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object|null>} 創建的下注記錄，失敗則回傳 null
     */
    async createBet(betData) {
        try {
            const { playerUUID, betType, amount, odds, result, betID = null, additionalInfo = {} } = betData;
            if (!playerUUID || !betType || amount === undefined || odds === undefined || !result) {
                Logger.debug(`[BetRepository.createBet] 缺少必要欄位: ${JSON.stringify(betData)}`);
                throw new Error('playerUUID、betType、amount、result 和 odds 為必填欄位');
            }

            if (!['win', 'lose'].includes(result)) {
                throw new Error('result 必須是 win 或 lose');
            }

            if (amount <= 0) {
                throw new Error('下注金額必須大於 0');
            }

            if (odds <= 0) {
                throw new Error('賠率必須大於 0');
            }

            const generatedBetID = betID || this.generateBetID();

            // 檢查 betID 是否已存在
            const existingBet = await this.getBetByID(generatedBetID);
            if (existingBet) {
                throw new Error(`下注記錄 ${generatedBetID} 已存在`);
            }

            const bet = {
                betID: generatedBetID,
                playerUUID,
                betType,
                amount,
                odds,
                result,
                createDate: new Date().toISOString(),
                additionalInfo
            };

            const success = await databaseService.put(`${this.prefix}${generatedBetID}`, bet);
            if (success) {
                Logger.info(`[BetRepository.createBet] 創建下注記錄: ${generatedBetID} (${playerUUID}, ${betType}, ${amount})`);
                return bet;
            }
            return null;
        } catch (error) {
            Logger.error(`[BetRepository.createBet] 創建下注記錄失敗:`, error);
            return null;
        }
    }

    /**
     * 根據下注 ID 獲取下注記錄
     * @param {string} betID - 下注 ID
     * @returns {Promise<Object|null>} 下注記錄
     */
    async getBetByID(betID) {
        try {
            const bet = await databaseService.get(`${this.prefix}${betID}`);
            if (bet) {
                Logger.debug(`[BetRepository.getBetByID] 找到下注記錄: ${betID}`);
            }
            return bet;
        } catch (error) {
            Logger.error(`[BetRepository.getBetByID] 獲取下注記錄失敗 (${betID}):`, error);
            return null;
        }
    }

    /**
     * 獲取用戶的下注記錄
     * @param {string} playerUUID - 玩家 UUID
     * @param {Object} options - 查詢選項
     * @param {number} options.limit - 限制數量 (可選)
     * @param {string} options.betType - 下注類型篩選 (可選)
     * @param {string} options.result - 結果篩選 (可選)
     * @returns {Promise<Object[]>} 下注記錄列表
     */
    async getUserBets(playerUUID, options = {}) {
        try {
            const { limit = null, betType = null, result = null } = options;
            
            const allBets = await databaseService.getRange(this.prefix);
            let userBets = Object.values(allBets)
                .filter(bet => bet.playerUUID === playerUUID);

            // 應用篩選條件
            if (betType) {
                userBets = userBets.filter(bet => bet.betType === betType);
            }
            if (result) {
                userBets = userBets.filter(bet => bet.result === result);
            }

            // 按創建日期排序 (最新的在前)
            userBets.sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            // 應用數量限制
            if (limit) {
                userBets = userBets.slice(0, limit);
            }

            Logger.debug(`[BetRepository.getUserBets] 獲取用戶 ${playerUUID} 的 ${userBets.length} 筆下注記錄`);
            return userBets;
        } catch (error) {
            Logger.error(`[BetRepository.getUserBets] 獲取用戶下注記錄失敗 (${playerUUID}):`, error);
            return [];
        }
    }

    /**
     * 更新下注記錄結果
     * @param {string} betID - 下注 ID
     * @param {string} newResult - 新的下注結果
     * @param {Object} additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object|null>} 更新後的下注記錄，失敗則回傳 null
     */
    async updateBetResult(betID, newResult, additionalInfo = {}) {
        try {
            const existingBet = await this.getBetByID(betID);
            if (!existingBet) {
                throw new Error(`下注記錄 ${betID} 不存在`);
            }

            if (!['win', 'lose'].includes(newResult)) {
                throw new Error('result 必須是 win 或 lose');
            }

            const updatedBet = {
                ...existingBet,
                result: newResult,
                settledDate: new Date().toISOString(),
                additionalInfo: {
                    ...existingBet.additionalInfo,
                    ...additionalInfo
                }
            };

            // 計算獲利/損失
            if (newResult === 'win') {
                updatedBet.winAmount = existingBet.amount * existingBet.odds;
                updatedBet.profit = updatedBet.winAmount - existingBet.amount;
            } else if (newResult === 'lose') {
                updatedBet.winAmount = 0;
                updatedBet.profit = -existingBet.amount;
            }

            const success = await databaseService.put(`${this.prefix}${betID}`, updatedBet);
            if (success) {
                Logger.info(`[BetRepository.updateBetResult] 更新下注結果: ${betID} -> ${newResult}`);
                return updatedBet;
            }
            return null;
        } catch (error) {
            Logger.error(`[BetRepository.updateBetResult] 更新下注結果失敗 (${betID}):`, error);
            return null;
        }
    }

    /**
     * 獲取下注統計資訊
     * @param {Object} options - 統計選項
     * @param {string} options.playerUUID - 特定用戶 (可選)
     * @param {string} options.betType - 特定下注類型 (可選)
     * @param {string} options.timeRange - 時間範圍 ('day', 'week', 'month', 'all')
     * @returns {Promise<Object>} 下注統計資訊
     */
    async getBetStats(options = {}) {
        try {
            const { playerUUID = null, betType = null, timeRange = 'all' } = options;
            
            let allBets = await databaseService.getRange(this.prefix);
            allBets = Object.values(allBets);

            // 應用篩選條件
            if (playerUUID) {
                allBets = allBets.filter(bet => bet.playerUUID === playerUUID);
            }
            if (betType) {
                allBets = allBets.filter(bet => bet.betType === betType);
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
                    allBets = allBets.filter(bet => 
                        new Date(bet.createDate) >= startDate
                    );
                }
            }

            const settledBets = allBets.filter(bet => ['win', 'lose'].includes(bet.result));
            const winBets = allBets.filter(bet => bet.result === 'win');
            const loseBets = allBets.filter(bet => bet.result === 'lose');

            const stats = {
                totalBets: allBets.length,
                settledBets: settledBets.length,
                winBets: winBets.length,
                loseBets: loseBets.length,
                totalBetAmount: allBets.reduce((sum, bet) => sum + bet.amount, 0),
                totalWinAmount: winBets.reduce((sum, bet) => sum + (bet.winAmount || 0), 0),
                totalProfit: settledBets.reduce((sum, bet) => sum + (bet.profit || 0), 0),
                winRate: settledBets.length > 0 
                    ? ((winBets.length / settledBets.length) * 100).toFixed(2)
                    : 0,
                averageBetAmount: allBets.length > 0 
                    ? (allBets.reduce((sum, bet) => sum + bet.amount, 0) / allBets.length).toFixed(2)
                    : 0,
                averageOdds: allBets.length > 0 
                    ? (allBets.reduce((sum, bet) => sum + bet.odds, 0) / allBets.length).toFixed(2)
                    : 0,
                uniqueUsers: new Set(allBets.map(bet => bet.playerUUID)).size,
                betTypes: [...new Set(allBets.map(bet => bet.betType))]
            };

            Logger.debug('[BetRepository.getBetStats] 獲取下注統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[BetRepository.getBetStats] 獲取下注統計失敗:', error);
            return null;
        }
    }

    /**
     * 獲取下注記錄 (分頁)
     * @param {Object} options - 查詢選項
     * @param {number} options.page - 頁數 (從 1 開始)
     * @param {number} options.limit - 每頁數量
     * @param {string} options.betType - 下注類型篩選 (可選)
     * @param {string} options.result - 結果篩選 (可選)
     * @returns {Promise<Object>} 分頁結果
     */
    async getBets(options = {}) {
        try {
            const { page = 1, limit = 20, betType = null, result = null } = options;
            
            let allBets = await databaseService.getRange(this.prefix);
            allBets = Object.values(allBets);

            // 應用篩選條件
            if (betType) {
                allBets = allBets.filter(bet => bet.betType === betType);
            }
            if (result) {
                allBets = allBets.filter(bet => bet.result === result);
            }

            // 按創建日期排序 (最新的在前)
            allBets.sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            // 分頁計算
            const totalRecords = allBets.length;
            const totalPages = Math.ceil(totalRecords / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const bets = allBets.slice(startIndex, endIndex);

            const result_obj = {
                bets,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalRecords,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

            Logger.debug(`[BetRepository.getBets] 獲取第 ${page} 頁下注記錄 (${bets.length}/${totalRecords})`);
            return result_obj;
        } catch (error) {
            Logger.error('[BetRepository.getBets] 獲取下注記錄失敗:', error);
            return { bets: [], pagination: null };
        }
    }

    /**
     * 獲取用戶下注排行榜
     * @param {string} sortBy - 排序方式 ('totalBets', 'totalAmount', 'totalProfit', 'winRate')
     * @param {number} limit - 限制數量 (預設 10)
     * @returns {Promise<Object[]>} 排行榜
     */
    async getUserLeaderboard(sortBy = 'totalAmount', limit = 10) {
        try {
            const allBets = await databaseService.getRange(this.prefix);
            const bets = Object.values(allBets);
            
            // 按用戶分組統計
            const userStats = {};
            for (const bet of bets) {
                if (!userStats[bet.playerUUID]) {
                    userStats[bet.playerUUID] = {
                        playerUUID: bet.playerUUID,
                        totalBets: 0,
                        totalAmount: 0,
                        totalWinAmount: 0,
                        totalProfit: 0,
                        winBets: 0,
                        loseBets: 0
                    };
                }
                
                const stats = userStats[bet.playerUUID];
                stats.totalBets++;
                stats.totalAmount += bet.amount;
                
                if (bet.result === 'win') {
                    stats.winBets++;
                    stats.totalWinAmount += bet.winAmount || 0;
                    stats.totalProfit += bet.profit || 0;
                } else if (bet.result === 'lose') {
                    stats.loseBets++;
                    stats.totalProfit += bet.profit || 0;
                }
            }
            
            // 計算勝率
            Object.values(userStats).forEach(stats => {
                const settledBets = stats.winBets + stats.loseBets;
                stats.winRate = settledBets > 0 ? (stats.winBets / settledBets) * 100 : 0;
            });
            
            // 排序
            const leaderboard = Object.values(userStats);
            switch (sortBy) {
                case 'totalBets':
                    leaderboard.sort((a, b) => b.totalBets - a.totalBets);
                    break;
                case 'totalAmount':
                    leaderboard.sort((a, b) => b.totalAmount - a.totalAmount);
                    break;
                case 'totalProfit':
                    leaderboard.sort((a, b) => b.totalProfit - a.totalProfit);
                    break;
                case 'winRate':
                    leaderboard.sort((a, b) => b.winRate - a.winRate);
                    break;
                default:
                    leaderboard.sort((a, b) => b.totalAmount - a.totalAmount);
            }

            const result = leaderboard.slice(0, limit);
            Logger.debug(`[BetRepository.getUserLeaderboard] 獲取下注排行榜 (${sortBy}, 前 ${result.length} 名)`);
            return result;
        } catch (error) {
            Logger.error('[BetRepository.getUserLeaderboard] 獲取下注排行榜失敗:', error);
            return [];
        }
    }

    /**
     * 刪除下注記錄
     * @param {string} betID - 下注 ID
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deleteBet(betID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${betID}`);
            if (success) {
                Logger.info(`[BetRepository.deleteBet] 刪除下注記錄: ${betID}`);
            } else {
                Logger.warn(`[BetRepository.deleteBet] 下注記錄不存在或刪除失敗: ${betID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[BetRepository.deleteBet] 刪除下注記錄失敗 (${betID}):`, error);
            return false;
        }
    }

    /**
     * 刪除用戶所有下注記錄
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<number>} 刪除的記錄數量
     */
    async deleteUserBets(playerUUID) {
        try {
            const userBets = await this.getUserBets(playerUUID);
            let deletedCount = 0;
            
            for (const bet of userBets) {
                const success = await this.deleteBet(bet.betID);
                if (success) {
                    deletedCount++;
                }
            }

            Logger.info(`[BetRepository.deleteUserBets] 刪除用戶 ${playerUUID} 的 ${deletedCount} 筆下注記錄`);
            return deletedCount;
        } catch (error) {
            Logger.error(`[BetRepository.deleteUserBets] 刪除用戶下注記錄失敗 (${playerUUID}):`, error);
            return 0;
        }
    }

    /**
     * 獲取特定時間範圍內的下注記錄
     * @param {string} startDate - 開始日期 (ISO 字符串)
     * @param {string} endDate - 結束日期 (ISO 字符串)
     * @returns {Promise<Object[]>} 下注記錄列表
     */
    async getBetsByDateRange(startDate, endDate) {
        try {
            const allBets = await databaseService.getRange(this.prefix);
            const bets = Object.values(allBets)
                .filter(bet => {
                    const betDate = new Date(bet.createDate);
                    return betDate >= new Date(startDate) && betDate <= new Date(endDate);
                })
                .sort((a, b) => new Date(b.createDate) - new Date(a.createDate));

            Logger.debug(`[BetRepository.getBetsByDateRange] 獲取 ${startDate} 到 ${endDate} 的 ${bets.length} 筆下注記錄`);
            return bets;
        } catch (error) {
            Logger.error(`[BetRepository.getBetsByDateRange] 獲取日期範圍下注記錄失敗:`, error);
            return [];
        }
    }
}

module.exports = BetRepository;