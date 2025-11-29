const databaseService = require('../services/general/databaseService');
const Logger = require('../utils/logger');
const { DatabaseError, UserError } = require('../utils/errors');
// TODO: 清理不必要的垃圾

class UserRepository {
    constructor() {
        this.prefix = 'userData:';
    }

    /**
     * 創建新用戶
     * @param {Object} userData - 用戶資料
     * @param {string} userData.playerUUID - 玩家 UUID
     * @param {string} userData.playerID - 玩家 ID
     * @param {string|null} userData.discordID - Discord ID (可選)
     * @param {number} userData.eWallet - 綠寶石錢包餘額 (預設 0)
     * @param {number} userData.cWallet - 村民錠錢包餘額 (預設 0)
     * @param {Object} userData.additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object>} 創建的用戶資料
     * @throws {DatabaseError} 當創建失敗時
     */
    async createUser(userData) {
        const { playerUUID, playerID, discordID = null, eWallet = 0, cWallet = 0, additionalInfo = {} } = userData;
        
        if (!playerUUID || !playerID) {
            throw new DatabaseError('playerUUID 和 playerID 為必填欄位', 'MISSING_REQUIRED_FIELDS', 'create');
        }

        // 檢查用戶是否已存在
        const existingUser = await this.getUserByUUID(playerUUID);
        if (existingUser) {
            throw DatabaseError.alreadyExists('用戶', playerUUID);
        }

        const user = {
            playerUUID,
            playerID,
            discordID,
            createDate: Math.floor(Date.now() / 1000), // unixtimestamp, second precision
            eWallet,
            cWallet,
            additionalInfo: {
                permissionLevel: 0, // default permission level
                blacklist: {
                    'status': false,
                    'reason': '',
                    'unbanTime': 0, // -1 means forever
                    'notified': false
                },
                rank: null,
                // TODO: add eula check
                acceptEULA: false,
                // TODO: add linkType check
                linkType: 0, // 0=local, 1=online
                ...additionalInfo
            }
        };

        const success = await databaseService.put(`${this.prefix}${playerUUID}`, user);
        if (!success) {
            throw DatabaseError.updateFailed('用戶', playerUUID);
        }
        
        Logger.info(`[UserRepository.createUser] 成功創建用戶: ${playerUUID} (${playerID})`);
        return user;
    }

    // TODO: 優化查詢邏輯
    async getUser({ identifier, by = 'uuid' }) {
        switch (by) {
            case 'uuid':
                return this.getUserByUUID(identifier);
            case 'playerID':
                return this.getUserByPlayerID(identifier);
            case 'discordID':
                return this.getUserByDiscordID(identifier);
            default:
                throw new UserError('無效的查詢方式', 'INVALID_QUERY_METHOD', 'getUser');
        }
    }

    async getUserByUUID(playerUUID) {
        const user = await databaseService.get(`${this.prefix}${playerUUID}`);
        if (user) {
            Logger.debug(`[UserRepository.getUserByUUID] 找到用戶: ${playerUUID}`);
        }
        return user;
    }

    async getUserByPlayerID(playerID) {
        const allUsers = await databaseService.getRange(this.prefix);
        for (const user of Object.values(allUsers)) {
            if (user.playerID === playerID) {
                Logger.debug(`[UserRepository.getUserByPlayerID] 找到用戶: ${playerID} (UUID: ${user.playerUUID})`);
                return user;
            }
        }
        Logger.debug(`[UserRepository.getUserByPlayerID] 用戶不存在: ${playerID}`);
        return null;
    }

    async getUserByDiscordID(discordID) {
        const allUsers = await databaseService.getRange(this.prefix);
        for (const user of Object.values(allUsers)) {
            if (user.discordID === discordID) {
                Logger.debug(`[UserRepository.getUserByDiscordID] 找到用戶: ${discordID} (UUID: ${user.playerUUID})`);
                return user;
            }
        }
        Logger.debug(`[UserRepository.getUserByDiscordID] 用戶不存在: ${discordID}`);
        return null;
    }

    async updateUser(playerUUID, updateData) {
        const existingUser = await this.getUserByUUID(playerUUID);
        if (!existingUser) {
            throw DatabaseError.notFound('用戶', playerUUID);
        }

        const updatedUser = {
            ...existingUser,
            ...updateData,
            playerUUID, // 確保 UUID 不被更改
            additionalInfo: {
                ...existingUser.additionalInfo,
                ...(updateData.additionalInfo || {})
            }
        };

        const success = await databaseService.put(`${this.prefix}${playerUUID}`, updatedUser);
        if (!success) {
            throw DatabaseError.updateFailed('用戶', playerUUID);
        }
        
        Logger.info(`[UserRepository.updateUser] 成功更新用戶: ${playerUUID}`);
        return updatedUser;
    }

    async updateWallet(playerUUID, walletType, amount) {
        const user = await this.getUserByUUID(playerUUID);
        if (!user) {
            throw DatabaseError.notFound('用戶', playerUUID);
        }

        if (!['eWallet', 'cWallet'].includes(walletType)) {
            throw new DatabaseError('錢包類型必須是 eWallet 或 cWallet', 'INVALID_WALLET_TYPE', 'update');
        }

        const currentBalance = user[walletType] || 0;
        const newBalance = amount === 0 ? 0 : currentBalance + amount;

        if (newBalance < 0) {
            throw new DatabaseError(
                `錢包餘額不足，當前餘額: ${currentBalance}，嘗試扣除: ${Math.abs(amount)}`,
                'INSUFFICIENT_WALLET_BALANCE',
                'update'
            );
        }

        const updateData = {
            [walletType]: newBalance
        };

        await this.updateUser(playerUUID, updateData);
        
        Logger.info(`[UserRepository.updateWallet] 用戶 ${playerUUID} ${walletType} 餘額更新: ${currentBalance} -> ${newBalance}`);
        return {
            walletType,
            previousBalance: currentBalance,
            newBalance,
            change: amount
        };
    }

    async setBlacklistStatus(playerUUID, isBlacklisted, reason = null) {
        try {
            const updateData = {
                additionalInfo: {
                    isBlacklisted,
                    blacklistReason: isBlacklisted ? reason : null
                }
            };

            const success = await this.updateUser(playerUUID, updateData);
            if (success) {
                const action = isBlacklisted ? '加入' : '移除';
                Logger.info(`[UserRepository.setBlacklistStatus] 用戶 ${playerUUID} 已${action}黑名單`);
            }
            return success;
        } catch (error) {
            Logger.error(`[UserRepository.setBlacklistStatus] 設置黑名單狀態失敗 (${playerUUID}):`, error);
            return false;
        }
    }

    async getAllUsers() {
        try {
            const usersData = await databaseService.getRange(this.prefix);
            const users = Object.values(usersData);
            Logger.debug(`[UserRepository.getAllUsers] 獲取 ${users.length} 個用戶`);
            return users;
        } catch (error) {
            Logger.error('[UserRepository.getAllUsers] 獲取所有用戶失敗:', error);
            return [];
        }
    }

    async deleteUser(playerUUID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${playerUUID}`);
            if (success) {
                Logger.info(`[UserRepository.deleteUser] 成功刪除用戶: ${playerUUID}`);
            } else {
                Logger.warn(`[UserRepository.deleteUser] 用戶不存在或刪除失敗: ${playerUUID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[UserRepository.deleteUser] 刪除用戶失敗 (${playerUUID}):`, error);
            return false;
        }
    }

    /**
     * 設定玩家身份組
     * @param {string} playerUUID - 玩家 UUID
     * @param {string|null} rankID - 玩家身份組 (null 表示移除等級)
     * @returns {Promise<boolean>} 是否設置成功
     */
    async setUserRank(playerUUID, rankID) {
        try {
            const updateData = {
                additionalInfo: {
                    rank: rankID,
                    rankSetTime: rankID ? Math.floor(Date.now() / 1000) : null,
                    rankRemovedTime: rankID ? null : Math.floor(Date.now() / 1000)
                }
            };

            const success = await this.updateUser(playerUUID, updateData);
            if (success) {
                const action = rankID ? '設置' : '移除';
                Logger.info(`[UserRepository.setUserRank] 用戶 ${playerUUID} 已${action}身份組: ${rankID || 'null'}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[UserRepository.setUserRank] 玩家身份組設定失敗 (${playerUUID}, ${rankID}):`, error);
            return false;
        }
    }

    /**
     * 取得有指定身份組的的所有玩家
     * @param {string} rankID - 身份組 ID
     * @returns {Promise<Object[]>} 有該身份組的玩家清單
     */
    async getUsersByRank(rankID) {
        try {
            const allUsers = await this.getAllUsers();
            const usersWithRank = allUsers.filter(user => 
                user.additionalInfo?.rank === rankID
            );
            Logger.debug(`[UserRepository.getUsersByRank] 有身份組 ${rankID} 的玩家共有 ${usersWithRank.length} 位`);
            return usersWithRank;
        } catch (error) {
            Logger.error(`[UserRepository.getUsersByRank] 取得有身份組的玩家失敗 (${rankID}):`, error);
            return [];
        }
    }

    /**
     * 取得使用者的身份組
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<string|null>} 玩家的身份組
     */
    async getUserRankID(playerUUID) {
        try {
            const user = await this.getUserByUUID(playerUUID);
            return user?.additionalInfo?.rank || null;
        } catch (error) {
            Logger.error(`[UserRepository.getUserRankID] 取得玩家身份組失敗 (${playerUUID}):`, error);
            return null;
        }
    }
}

module.exports = UserRepository;