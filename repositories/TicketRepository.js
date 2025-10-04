const databaseService = require('../services/databaseService');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
/**
 * 票券資料 Repository
 * 管理票券系統，包含票券創建、查詢、更新等功能
 * 
 * 資料格式:
 * - ticketID: 票券唯一識別碼
 * - ticketName: 票券名稱
 * - description: 票券描述
 * - reward: 獎勵 (JSON 物件) {"emerald": amount, "coin": amount}
 * - claimPassword: 兌換密碼
 * - createDate: 創建日期
 * - additionalInfo: 額外資訊 (JSON 物件)
 */
class TicketRepository {
    constructor() {
        this.prefix = 'tickets:';
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
     * @returns {Promise<boolean>} 是否創建成功
     */
    async createTicket(ticketData) {
        try {
            const { ticketID, ticketName, description, reward, claimPassword, additionalInfo = {} } = ticketData;
            
            if (!ticketID || !ticketName || !description || !reward || !claimPassword) {
                throw new Error('ticketID, ticketName, description, reward, claimPassword 為必填欄位');
            }

            // 檢查票券是否已存在
            const existingTicket = await this.getTicketByID(ticketID);
            if (existingTicket) {
                throw new Error(`票券 ${ticketID} 已存在`);
            }

            // 驗證 reward 格式
            if (typeof reward !== 'object' || (!reward.emerald && !reward.coin)) {
                throw new Error('reward 必須包含 emerald 或 coin 欄位');
            }

            const ticket = {
                ticketID,
                ticketName,
                description,
                reward: {
                    emerald: reward.emerald || 0,
                    coin: reward.coin || 0
                },
                claimPassword,
                createDate: Math.floor(Date.now() / 1000), // unixtimestamp, second precision
                additionalInfo: {
                    isActive: true,
                    claimCount: 0,
                    maxClaims: null, // null 表示無限制
                    expiryDate: null, // null 表示永不過期
                    ...additionalInfo
                }
            };

            const success = await databaseService.put(`${this.prefix}${ticketID}`, ticket);
            if (success) {
                Logger.info(`[TicketRepository.createTicket] 成功創建票券: ${ticketID} (${ticketName})`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.createTicket] 創建票券失敗:`, error);
            return false;
        }
    }

    /**
     * 根據 ID 獲取票券資料
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<Object|null>} 票券資料
     */
    async getTicketByID(ticketID) {
        try {
            const ticket = await databaseService.get(`${this.prefix}${ticketID}`);
            if (ticket) {
                Logger.debug(`[TicketRepository.getTicketByID] 找到票券: ${ticketID}`);
            }
            return ticket;
        } catch (error) {
            Logger.error(`[TicketRepository.getTicketByID] 獲取票券失敗 (${ticketID}):`, error);
            return null;
        }
    }

    /**
     * 根據名稱搜索票券
     * @param {string} ticketName - 票券名稱
     * @returns {Promise<Object[]>} 票券列表
     */
    async getTicketsByName(ticketName) {
        try {
            const allTickets = await databaseService.getRange(this.prefix);
            const matchingTickets = Object.values(allTickets).filter(ticket =>
                ticket.ticketName.toLowerCase().includes(ticketName.toLowerCase())
            );
            Logger.debug(`[TicketRepository.getTicketsByName] 找到 ${matchingTickets.length} 個匹配的票券`);
            return matchingTickets;
        } catch (error) {
            Logger.error(`[TicketRepository.getTicketsByName] 搜索票券失敗 (${ticketName}):`, error);
            return [];
        }
    }

    /**
     * 更新票券資料
     * @param {string} ticketID - 票券 ID
     * @param {Object} updateData - 要更新的資料
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updateTicket(ticketID, updateData) {
        try {
            const existingTicket = await this.getTicketByID(ticketID);
            if (!existingTicket) {
                throw new Error(`票券 ${ticketID} 不存在`);
            }

            const updatedTicket = {
                ...existingTicket,
                ...updateData,
                ticketID, // 確保 ID 不被更改
                additionalInfo: {
                    ...existingTicket.additionalInfo,
                    ...(updateData.additionalInfo || {})
                }
            };

            // 如果更新了 reward，確保格式正確
            if (updateData.reward) {
                updatedTicket.reward = {
                    emerald: updateData.reward.emerald || 0,
                    coin: updateData.reward.coin || 0
                };
            }

            const success = await databaseService.put(`${this.prefix}${ticketID}`, updatedTicket);
            if (success) {
                Logger.info(`[TicketRepository.updateTicket] 成功更新票券: ${ticketID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.updateTicket] 更新票券失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 驗證票券密碼
     * @param {string} ticketID - 票券 ID
     * @param {string} password - 輸入的密碼
     * @returns {Promise<boolean>} 密碼是否正確
     */
    async verifyTicketPassword(ticketID, password) {
        try {
            const ticket = await this.getTicketByID(ticketID);
            if (!ticket) {
                return false;
            }
            return ticket.claimPassword === password;
        } catch (error) {
            Logger.error(`[TicketRepository.verifyTicketPassword] 驗證密碼失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 檢查票券是否可兌換
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<Object>} 檢查結果 {canClaim: boolean, reason?: string, ticket?: Object}
     */
    async checkTicketClaimable(ticketID) {
        try {
            const ticket = await this.getTicketByID(ticketID);
            if (!ticket) {
                return { canClaim: false, reason: '票券不存在' };
            }

            // 檢查票券是否啟用
            if (!ticket.additionalInfo?.isActive) {
                return { canClaim: false, reason: '票券已停用', ticket };
            }

            // 檢查是否過期
            if (ticket.additionalInfo?.expiryDate && 
                Math.floor(Date.now() / 1000) > ticket.additionalInfo.expiryDate) {
                return { canClaim: false, reason: '票券已過期', ticket };
            }

            // 檢查兌換次數限制
            if (ticket.additionalInfo?.maxClaims && 
                ticket.additionalInfo.claimCount >= ticket.additionalInfo.maxClaims) {
                return { canClaim: false, reason: '票券兌換次數已達上限', ticket };
            }

            return { canClaim: true, ticket };
        } catch (error) {
            Logger.error(`[TicketRepository.checkTicketClaimable] 檢查票券可兌換性失敗 (${ticketID}):`, error);
            return { canClaim: false, reason: '系統錯誤' };
        }
    }

    /**
     * 增加票券兌換計數
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<boolean>} 是否更新成功
     */
    async incrementClaimCount(ticketID) {
        try {
            const ticket = await this.getTicketByID(ticketID);
            if (!ticket) {
                throw new Error(`票券 ${ticketID} 不存在`);
            }

            const updateData = {
                additionalInfo: {
                    claimCount: (ticket.additionalInfo?.claimCount || 0) + 1,
                    lastClaimDate: Math.floor(Date.now() / 1000)
                }
            };

            const success = await this.updateTicket(ticketID, updateData);
            if (success) {
                Logger.info(`[TicketRepository.incrementClaimCount] 票券 ${ticketID} 兌換計數 +1`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.incrementClaimCount] 增加兌換計數失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 設置票券啟用狀態
     * @param {string} ticketID - 票券 ID
     * @param {boolean} isActive - 是否啟用
     * @returns {Promise<boolean>} 是否設置成功
     */
    async setTicketActiveStatus(ticketID, isActive) {
        try {
            const updateData = {
                additionalInfo: {
                    isActive,
                    statusChangeDate: Math.floor(Date.now() / 1000)
                }
            };

            const success = await this.updateTicket(ticketID, updateData);
            if (success) {
                const action = isActive ? '啟用' : '停用';
                Logger.info(`[TicketRepository.setTicketActiveStatus] 票券 ${ticketID} 已${action}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.setTicketActiveStatus] 設置票券狀態失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 獲取所有票券
     * @param {boolean} onlyActive - 是否只獲取啟用的票券
     * @returns {Promise<Object[]>} 票券列表
     */
    async getAllTickets(onlyActive = false) {
        try {
            const ticketsData = await databaseService.getRange(this.prefix);
            let tickets = Object.values(ticketsData);
            
            if (onlyActive) {
                tickets = tickets.filter(ticket => ticket.additionalInfo?.isActive);
            }
            
            Logger.debug(`[TicketRepository.getAllTickets] 獲取 ${tickets.length} 個票券`);
            return tickets;
        } catch (error) {
            Logger.error('[TicketRepository.getAllTickets] 獲取所有票券失敗:', error);
            return [];
        }
    }

    /**
     * 刪除票券
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async deleteTicket(ticketID) {
        try {
            const success = await databaseService.remove(`${this.prefix}${ticketID}`);
            if (success) {
                Logger.info(`[TicketRepository.deleteTicket] 成功刪除票券: ${ticketID}`);
            } else {
                Logger.warn(`[TicketRepository.deleteTicket] 票券不存在或刪除失敗: ${ticketID}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.deleteTicket] 刪除票券失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 檢查票券是否存在
     * @param {string} ticketID - 票券 ID
     * @returns {Promise<boolean>} 票券是否存在
     */
    async ticketExists(ticketID) {
        try {
            return await databaseService.exists(`${this.prefix}${ticketID}`);
        } catch (error) {
            Logger.error(`[TicketRepository.ticketExists] 檢查票券存在性失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 設置票券過期時間
     * @param {string} ticketID - 票券 ID
     * @param {number|null} expiryTimestamp - 過期時間戳 (null 表示永不過期)
     * @returns {Promise<boolean>} 是否設置成功
     */
    async setTicketExpiry(ticketID, expiryTimestamp) {
        try {
            const updateData = {
                additionalInfo: {
                    expiryDate: expiryTimestamp,
                    expirySetDate: Math.floor(Date.now() / 1000)
                }
            };

            const success = await this.updateTicket(ticketID, updateData);
            if (success) {
                const status = expiryTimestamp ? `設置過期時間: ${new Date(expiryTimestamp * 1000).toLocaleString()}` : '移除過期時間';
                Logger.info(`[TicketRepository.setTicketExpiry] 票券 ${ticketID} ${status}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.setTicketExpiry] 設置票券過期時間失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 設置票券最大兌換次數
     * @param {string} ticketID - 票券 ID
     * @param {number|null} maxClaims - 最大兌換次數 (null 表示無限制)
     * @returns {Promise<boolean>} 是否設置成功
     */
    async setTicketMaxClaims(ticketID, maxClaims) {
        try {
            const updateData = {
                additionalInfo: {
                    maxClaims,
                    maxClaimsSetDate: Math.floor(Date.now() / 1000)
                }
            };

            const success = await this.updateTicket(ticketID, updateData);
            if (success) {
                const status = maxClaims ? `設置最大兌換次數: ${maxClaims}` : '移除兌換次數限制';
                Logger.info(`[TicketRepository.setTicketMaxClaims] 票券 ${ticketID} ${status}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[TicketRepository.setTicketMaxClaims] 設置票券最大兌換次數失敗 (${ticketID}):`, error);
            return false;
        }
    }

    /**
     * 獲取票券統計資訊
     * @returns {Promise<Object>} 票券統計資訊
     */
    async getTicketStats() {
        try {
            const tickets = await this.getAllTickets();
            const activeTickets = tickets.filter(t => t.additionalInfo?.isActive);
            const expiredTickets = tickets.filter(t => 
                t.additionalInfo?.expiryDate && 
                Math.floor(Date.now() / 1000) > t.additionalInfo.expiryDate
            );
            const totalClaims = tickets.reduce((sum, t) => sum + (t.additionalInfo?.claimCount || 0), 0);
            const totalEmeraldRewards = tickets.reduce((sum, t) => sum + (t.reward?.emerald || 0), 0);
            const totalCoinRewards = tickets.reduce((sum, t) => sum + (t.reward?.coin || 0), 0);

            const stats = {
                totalTickets: tickets.length,
                activeTickets: activeTickets.length,
                inactiveTickets: tickets.length - activeTickets.length,
                expiredTickets: expiredTickets.length,
                totalClaims,
                totalEmeraldRewards,
                totalCoinRewards
            };
            Logger.debug('[TicketRepository.getTicketStats] 獲取票券統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[TicketRepository.getTicketStats] 獲取票券統計失敗:', error);
            return null;
        }
    }
}

module.exports = TicketRepository;