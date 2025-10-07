const { ticketRepository, userRepository } = require('../../repositories');
const Logger = require('../../utils/logger');
const { ValidationError, DatabaseError, UserError } = require('../../utils/errors');
// TODO: 清理不必要的垃圾
/**
 * 票券服務
 * 處理票券相關的業務邏輯，包含票券創建、兌換、管理等功能
 */
class TicketService {
    constructor() {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    /**
     * 創建新票券
     * @param {Object} ticketData - 票券資料
     * @param {string} ticketData.ticketID - 票券 ID
     * @param {string} ticketData.ticketName - 票券名稱
     * @param {string} ticketData.description - 票券描述
     * @param {Object} ticketData.reward - 獎勵 {emerald: number, coin: number}
     * @param {string} ticketData.claimPassword - 兌換密碼
     * @param {Object} ticketData.additionalInfo - 額外資訊 (可選)
     * @returns {Promise<Object>} 操作結果
     */
    async createTicket(ticketData) {
        Logger.info(`[TicketService.createTicket] 嘗試創建票券: ${ticketData.ticketID}`);

        // 驗證輸入數據
        this._validateTicketData(ticketData);

        // 創建票券
        const success = await this.ticketRepository.createTicket(ticketData);
        if (!success) {
            throw DatabaseError.createFailed('票券', ticketData.ticketID);
        }

        Logger.info(`[TicketService.createTicket] 成功創建票券: ${ticketData.ticketID}`);
        return {
            ticketID: ticketData.ticketID,
            ticketName: ticketData.ticketName
        };
    }

    /**
     * 兌換票券
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} ticketID - 票券 ID
     * @param {string} password - 兌換密碼
     * @returns {Promise<Object>} 兌換結果
     */
    async claimTicket(playerUUID, ticketID, password) {
        Logger.info(`[TicketService.claimTicket] 玩家 ${playerUUID} 嘗試兌換票券: ${ticketID}`);

        // 檢查用戶是否存在
        const user = await this.userRepository.getUserByUUID(playerUUID);
        if (!user) {
            throw UserError.notFound(playerUUID);
        }

        // 檢查用戶是否在黑名單
        if (user.additionalInfo?.isBlacklisted) {
            throw UserError.blacklisted(playerUUID);
        }

        // 檢查票券是否可兌換
        const claimableCheck = await this.ticketRepository.checkTicketClaimable(ticketID);
        if (!claimableCheck.canClaim) {
            throw new ValidationError(claimableCheck.reason, 'ticketID');
        }

        const ticket = claimableCheck.ticket;

        // 驗證密碼
        const passwordValid = await this.ticketRepository.verifyTicketPassword(ticketID, password);
        if (!passwordValid) {
            Logger.warn(`[TicketService.claimTicket] 玩家 ${playerUUID} 票券 ${ticketID} 密碼錯誤`);
            throw new ValidationError('兌換密碼錯誤', 'password');
        }

        // 檢查用戶是否已經兌換過此票券 (可選功能)
        const hasClaimedBefore = await this._hasUserClaimedTicket(playerUUID, ticketID);
        if (hasClaimedBefore && ticket.additionalInfo?.oneTimePerUser) {
            throw new ValidationError('您已經兌換過此票券了', 'ticketID');
        }

        // 發放獎勵
        await this._distributeTicketReward(playerUUID, ticket.reward);

        // 更新票券兌換計數
        await this.ticketRepository.incrementClaimCount(ticketID);

        // 記錄兌換歷史
        await this._recordTicketClaim(playerUUID, ticketID, ticket.reward);

        Logger.info(`[TicketService.claimTicket] 玩家 ${playerUUID} 成功兌換票券 ${ticketID}: ${JSON.stringify(ticket.reward)}`);
        
        return {
            reward: ticket.reward,
            ticketName: ticket.ticketName,
            rewardText: this._formatReward(ticket.reward)
        };
    }

    /**
     * 根據名稱或 ID 搜索票券
     * @param {string} query - 搜索關鍵字
     * @param {Object} options - 搜索選項
     * @param {boolean} options.onlyActive - 只搜索啟用的票券
     * @param {number} options.limit - 結果限制數量
     * @returns {Promise<Object[]>} 票券列表
     */
    async searchTickets(query, options = {}) {
        try {
            const { onlyActive = true, limit = 10 } = options;
            Logger.debug(`[TicketService.searchTickets] 搜索票券: "${query}"`);

            let tickets = [];

            // 首先嘗試精確匹配 ID
            const ticketByID = await this.ticketRepository.getTicketByID(query);
            if (ticketByID && (!onlyActive || ticketByID.additionalInfo?.isActive)) {
                tickets.push(ticketByID);
            }

            // 然後搜索名稱匹配
            const ticketsByName = await this.ticketRepository.getTicketsByName(query);
            const filteredByName = ticketsByName.filter(ticket => {
                // 避免重複添加已通過 ID 找到的票券
                if (ticket.ticketID === query) return false;
                return !onlyActive || ticket.additionalInfo?.isActive;
            });

            tickets = tickets.concat(filteredByName);

            // 限制結果數量
            if (limit > 0) {
                tickets = tickets.slice(0, limit);
            }

            // 為搜索結果添加格式化資訊
            const formattedTickets = tickets.map(ticket => ({
                ...ticket,
                rewardText: this._formatReward(ticket.reward),
                statusText: this._getTicketStatusText(ticket)
            }));

            Logger.debug(`[TicketService.searchTickets] 找到 ${formattedTickets.length} 個匹配的票券`);
            return formattedTickets;

        } catch (error) {
            Logger.error(`[TicketService.searchTickets] 搜索票券失敗:`, error);
            return [];
        }
    }

    /**
     * 獲取票券詳細資訊
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<Object|null>} 票券詳細資訊
     */
    async getTicketInfo(ticketID) {
        const ticket = await this.ticketRepository.getTicketByID(ticketID);
        if (!ticket) {
            return null;
        }

        const claimableCheck = await this.ticketRepository.checkTicketClaimable(ticketID);
        
        return {
            ...ticket,
            rewardText: this._formatReward(ticket.reward),
            statusText: this._getTicketStatusText(ticket),
            canClaim: claimableCheck.canClaim,
            claimReason: claimableCheck.reason || null,
            remainingClaims: this._getRemainingClaims(ticket)
        };
    }

    /**
     * 更新票券狀態
     * @param {string} ticketID - 票券 ID
     * @param {boolean} isActive - 是否啟用
     * @returns {Promise<Object>} 操作結果
     */
    async updateTicketStatus(ticketID, isActive) {
        const success = await this.ticketRepository.setTicketActiveStatus(ticketID, isActive);
        if (!success) {
            throw DatabaseError.notFound('票券', ticketID);
        }

        const action = isActive ? '啟用' : '停用';
        Logger.info(`[TicketService.updateTicketStatus] 票券 ${ticketID} 已${action}`);
        return { ticketID, isActive, action };
    }

    /**
     * 獲取票券統計資訊
     * @returns {Promise<Object|null>} 統計資訊
     */
    async getTicketStatistics() {
        const stats = await this.ticketRepository.getTicketStats();
        if (stats) {
            Logger.debug('[TicketService.getTicketStatistics] 獲取票券統計資訊');
            return {
                ...stats,
                claimRate: stats.totalTickets > 0 ? (stats.totalClaims / stats.totalTickets).toFixed(2) : 0
            };
        }
        return null;
    }

    /**
     * 刪除票券
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<Object>} 操作結果
     */
    async deleteTicket(ticketID) {
        const ticket = await this.ticketRepository.getTicketByID(ticketID);
        if (!ticket) {
            throw DatabaseError.notFound('票券', ticketID);
        }

        const success = await this.ticketRepository.deleteTicket(ticketID);
        if (!success) {
            throw DatabaseError.deleteFailed('票券', ticketID);
        }

        Logger.info(`[TicketService.deleteTicket] 票券 ${ticketID} 已刪除`);
        return ticket;
    }

    // === 私有方法 ===

    /**
     * 驗證票券數據
     * @private
     * @param {Object} ticketData - 票券數據
     * @returns {Object} 驗證結果
     */
    _validateTicketData(ticketData) {
        const errors = [];
        
        if (!ticketData.ticketID || typeof ticketData.ticketID !== 'string') {
            errors.push('票券 ID 必須是非空字符串');
        }
        
        if (!ticketData.ticketName || typeof ticketData.ticketName !== 'string') {
            errors.push('票券名稱必須是非空字符串');
        }
        
        if (!ticketData.description || typeof ticketData.description !== 'string') {
            errors.push('票券描述必須是非空字符串');
        }
        
        if (!ticketData.claimPassword || typeof ticketData.claimPassword !== 'string') {
            errors.push('兌換密碼必須是非空字符串');
        }
        
        if (!ticketData.reward || typeof ticketData.reward !== 'object') {
            errors.push('獎勵必須是對象');
        } else {
            const { emerald, coin } = ticketData.reward;
            if ((!emerald || emerald <= 0) && (!coin || coin <= 0)) {
                errors.push('獎勵必須包含大於 0 的綠寶石或村民錠');
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '), 'ticketData');
        }
    }

    /**
     * 發放票券獎勵
     * @private
     * @param {string} playerUUID - 玩家 UUID
     * @param {Object} reward - 獎勵 {emerald: number, coin: number}
     * @returns {Promise<Object>} 發放結果
     */
    async _distributeTicketReward(playerUUID, reward) {
        const rewardDetails = [];

        // 發放綠寶石
        if (reward.emerald && reward.emerald > 0) {
            const eWalletResult = await this.userRepository.updateWallet(playerUUID, 'eWallet', reward.emerald);
            if (!eWalletResult) {
                throw DatabaseError.updateFailed('錢包 (eWallet)', playerUUID);
            }
            rewardDetails.push(`綠寶石 +${reward.emerald}`);
        }

        // 發放村民錠
        if (reward.coin && reward.coin > 0) {
            const cWalletResult = await this.userRepository.updateWallet(playerUUID, 'cWallet', reward.coin);
            if (!cWalletResult) {
                throw DatabaseError.updateFailed('錢包 (cWallet)', playerUUID);
            }
            rewardDetails.push(`村民錠 +${reward.coin}`);
        }

        Logger.info(`[TicketService._distributeTicketReward] 獎勵發放成功: ${rewardDetails.join(', ')}`);
    }

    /**
     * 記錄票券兌換歷史
     * @private
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} ticketID - 票券 ID
     * @param {Object} reward - 獎勵
     * @returns {Promise<void>}
     */
    async _recordTicketClaim(playerUUID, ticketID, reward) {
        try {
            const user = await this.userRepository.getUserByUUID(playerUUID);
            if (!user) return;

            const claimHistory = user.additionalInfo?.ticketClaimHistory || [];
            claimHistory.push({
                ticketID,
                claimDate: Math.floor(Date.now() / 1000),
                reward
            });

            // 只保留最近 50 次兌換記錄
            const recentHistory = claimHistory.slice(-50);

            await this.userRepository.updateUser(playerUUID, {
                additionalInfo: {
                    ...user.additionalInfo,
                    ticketClaimHistory: recentHistory
                }
            });
        } catch (error) {
            Logger.error(`[TicketService._recordTicketClaim] 記錄兌換歷史失敗:`, error);
        }
    }

    /**
     * 檢查用戶是否已兌換過票券
     * @private
     * @param {string} playerUUID - 玩家 UUID
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<boolean>} 是否已兌換過
     */
    async _hasUserClaimedTicket(playerUUID, ticketID) {
        const user = await this.userRepository.getUserByUUID(playerUUID);
        if (!user || !user.additionalInfo?.ticketClaimHistory) {
            return false;
        }

        return user.additionalInfo.ticketClaimHistory.some(claim => claim.ticketID === ticketID);
    }

    /**
     * 格式化獎勵文字
     * @private
     * @param {Object} reward - 獎勵對象
     * @returns {string} 格式化的獎勵文字
     */
    _formatReward(reward) {
        const parts = [];
        if (reward.emerald && reward.emerald > 0) {
            parts.push(`${reward.emerald} 綠寶石`);
        }
        if (reward.coin && reward.coin > 0) {
            parts.push(`${reward.coin} 村民錠`);
        }
        return parts.join(' + ') || '無獎勵';
    }

    /**
     * 獲取票券狀態文字
     * @private
     * @param {Object} ticket - 票券對象
     * @returns {string} 狀態文字
     */
    _getTicketStatusText(ticket) {
        if (!ticket.additionalInfo?.isActive) {
            return '已停用';
        }
        
        if (ticket.additionalInfo?.expiryDate && 
            Math.floor(Date.now() / 1000) > ticket.additionalInfo.expiryDate) {
            return '已過期';
        }
        
        if (ticket.additionalInfo?.maxClaims && 
            ticket.additionalInfo.claimCount >= ticket.additionalInfo.maxClaims) {
            return '已達兌換上限';
        }
        
        return '可兌換';
    }

    /**
     * 獲取剩餘兌換次數
     * @private
     * @param {Object} ticket - 票券對象
     * @returns {number|string} 剩餘次數或 "無限制"
     */
    _getRemainingClaims(ticket) {
        if (!ticket.additionalInfo?.maxClaims) {
            return '無限制';
        }
        
        const remaining = ticket.additionalInfo.maxClaims - (ticket.additionalInfo.claimCount || 0);
        return Math.max(0, remaining);
    }
}

module.exports = new TicketService();