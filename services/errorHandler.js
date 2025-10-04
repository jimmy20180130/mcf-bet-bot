const Logger = require('../utils/logger');
const errorHistoryService = require('./errorHistoryService');
const { userRepository } = require('../repositories');
const { 
    AppError, 
    PaymentError, 
    BetError, 
    DatabaseError,
    UserError,
    isOperationalError,
    extractErrorInfo 
} = require('../utils/errors');

// TODO: 加上在 Discord 裡面紀錄錯誤
class errorHandler {
    constructor() {
        this.errorHistoryService = errorHistoryService;
        this.userRepository = userRepository;
    }

    /**
     * 統一的錯誤處理入口
     * @param {Error} error - 錯誤物件
     * @param {Object} context - 錯誤上下文 { bot, playerId, playerUUID, operation, additionalInfo }
     * @returns {Promise<Object>} 處理結果 { success, errorID, message, shouldNotifyUser }
     */
    async handleError(error, context = {}) {
        try {
            const { bot, playerId, playerUUID, operation = 'unknown' } = context;
            
            // 提取錯誤資訊
            const errorInfo = extractErrorInfo(error);
            Logger.error(`[errorHandler.handleError] [${operation}] ${playerId || 'unknown'}:`, error);
            
            // 判斷是否需要記錄到資料庫
            const shouldLog = isOperationalError(error) || error instanceof AppError;
            let errorID = null;
            
            if (shouldLog && playerUUID) {
                const logResult = await this._logError(error, playerUUID, context);
                if (logResult.success) {
                    errorID = logResult.errorID;
                }
            }
            
            // 構建用戶通知訊息
            const userMessage = this._buildUserMessage(error, errorID);
            
            // 如果有 bot 和 playerId，發送通知
            if (bot && playerId && userMessage) {
                bot.chat(`/m ${playerId} ${userMessage}`);
            }
            
            return {
                success: errorID !== null,
                errorID,
                message: errorInfo.message,
                code: errorInfo.code,
                shouldNotifyUser: isOperationalError(error)
            };
        } catch (handlerError) {
            Logger.error(`[errorHandler.handleError] 處理錯誤時發生異常:`, handlerError);
            return {
                success: false,
                errorID: null,
                message: error.message || '未知錯誤',
                code: 'HANDLER_ERROR',
                shouldNotifyUser: true
            };
        }
    }

    /**
     * 記錄錯誤到資料庫
     * @private
     */
    async _logError(error, playerUUID, context) {
        try {
            const errorInfo = extractErrorInfo(error);
            const { operation, additionalInfo = {} } = context;
            
            let logMethod = 'logError';
            if (error instanceof PaymentError) {
                logMethod = 'logPaymentError';
            } else if (error instanceof BetError) {
                logMethod = 'logBetError';
            }
            
            return await this.errorHistoryService[logMethod](
                errorInfo.message,
                playerUUID,
                {
                    ...additionalInfo,
                    errorCode: errorInfo.code,
                    operation,
                    timestamp: errorInfo.timestamp
                }
            );
        } catch (error) {
            Logger.error('[errorHandler._logError] 記錄錯誤失敗:', error);
            return { success: false };
        }
    }

    /**
     * 構建用戶可讀的錯誤訊息
     * @private
     */
    _buildUserMessage(error, errorID) {
        let message = '';
        
        if (error instanceof PaymentError) {
            switch (error.code) {
                case 'INSUFFICIENT_BALANCE':
                    message = `&c餘額不足`;
                    break;
                case 'PAYMENT_TIMEOUT':
                    message = `&c轉帳超時，請稍後再試`;
                    break;
                case 'PLAYER_NOT_FOUND':
                    message = `&c找不到目標玩家或不在同個分流`;
                    break;
                case 'INVALID_AMOUNT':
                    message = `&c金額無效`;
                    break;
                default:
                    message = `&c付款失敗: ${error.message}`;
            }
        } else if (error instanceof BetError) {
            switch (error.code) {
                case 'INSUFFICIENT_BALANCE':
                    message = `&c餘額不足，無法下注`;
                    break;
                case 'REDSTONE_NOT_FOUND':
                    message = `&c找不到紅石粉`;
                    break;
                case 'REDSTONE_TIMEOUT':
                    message = `&c偵測結果超時，請稍後再試`;
                    break;
                case 'NO_PERMISSION':
                    message = `&cBot 沒有權限執行操作`;
                    break;
                case 'INVALID_AMOUNT':
                    message = `&c下注金額無效`;
                    break;
                case 'PLAYER_BLACKLISTED':
                    message = `&c您已被封鎖使用本機器人`;
                    break;
                default:
                    message = `&c下注失敗: ${error.message}`;
            }
        } else if (error instanceof UserError) {
            switch (error.code) {
                case 'UUID_NOT_FOUND':
                    message = `&c無法取得您的 UUID`;
                    break;
                case 'EULA_NOT_ACCEPTED':
                    message = `&c您尚未接受使用條款`;
                    break;
                default:
                    message = `&c${error.message}`;
            }
        } else if (isOperationalError(error)) {
            message = `&c${error.message}`;
        } else {
            message = `&c操作失敗，請稍後再試`;
        }
        
        // 添加錯誤 ID
        if (errorID) {
            message += ` &7(錯誤ID: ${errorID})`;
        }
        
        return message;
    }
    // TODO: 這裡改成從 userinfoService 拿 UUID
    /**
     * 根據玩家 ID 獲取玩家 UUID
     * @param {string} playerId - 玩家 ID
     * @returns {Promise<string|null>} 玩家 UUID
     */
    async getPlayerUUID(playerId) {
        try {
            const users = await this.userRepository.getAllUsers();
            const user = users.find(u => u.playerID === playerId);
            return user ? user.playerUUID : null;
        } catch (error) {
            Logger.error(`[errorHandler.getPlayerUUID] 獲取玩家 UUID 失敗 (${playerId}):`, error);
            return null;
        }
    }

    // 任何轉帳所發生的錯誤都會交由這個 function 處理
    // 包括下注失敗、epay 失敗等
    // TODO: 超時的部分在 Discord 裡面的該錯誤訊息新增"加到錢包"的按鈕
    // TODO: 除了超時以外的錯誤全部加到錢包內
    /**
     * @deprecated 請使用 handleError() 替代
     */
    async handlePaymentError(bot, playerId, error, paymentDetails = {}) {
        const playerUUID = await this.getPlayerUUID(playerId);
        
        // 轉換為統一的錯誤處理
        if (!(error instanceof PaymentError)) {
            error = new PaymentError(error.message || error.toString(), 'PAYMENT_ERROR', paymentDetails);
        }
        
        return await this.handleError(error, {
            bot,
            playerId,
            playerUUID,
            operation: 'payment',
            additionalInfo: paymentDetails
        });
    }

    // 這裡處理下注失敗的錯誤
    // 包括餘額不足、找不到紅石粉、偵測紅石粉超時等等
    /**
     * @deprecated 請使用 handleError() 替代
     */
    async handleBetError(bot, playerId, errorType, errorMessage, betDetails = {}) {
        const playerUUID = await this.getPlayerUUID(playerId);
        
        // 根據錯誤類型創建對應的 BetError
        let error;
        switch (errorType) {
            case 'INSUFFICIENT_BALANCE':
                error = BetError.insufficientBalance(betDetails.amount, betDetails.currentAmount);
                break;
            case 'REDSTONE_NOT_FOUND':
                error = BetError.redstoneNotFound();
                break;
            case 'REDSTONE_TIMEOUT':
                error = BetError.redstoneTimeout();
                break;
            case 'NO_PERMISSION':
                error = BetError.noPermission('按紅石粉');
                break;
            case 'INVALID_AMOUNT':
                error = BetError.invalidAmount(betDetails.amount);
                break;
            default:
                error = new BetError(errorMessage, errorType, betDetails);
        }
        
        const result = await this.handleError(error, {
            bot,
            playerId,
            playerUUID,
            operation: 'bet',
            additionalInfo: betDetails
        });
        
        // 返回舊格式以保持兼容性
        return {
            result: result.success ? 'success' : 'error',
            errorID: result.errorID,
            responseMessage: result.message
        };
    }

    /**
     * 處理 Discord 錯誤
     * @param {string} playerId - 玩家 ID
     * @param {Error} error - 錯誤物件
     * @param {Object} discordDetails - Discord 詳情
     * @returns {Promise<string|null>} 錯誤 ID
     */
    async handleDiscordError(playerId, error, discordDetails = {}) {
        try {
            const playerUUID = await this.getPlayerUUID(playerId);
            const errorMessage = error.message || error.toString();
            
            const result = await this.errorHistoryService.logDiscordError(errorMessage, playerUUID, {
                playerId,
                ...discordDetails
            });

            if (result.success) {
                Logger.info(`[errorHandler.handleDiscordError] Discord 錯誤已記錄: ${result.errorID}`);
                return result.errorID;
            } else {
                Logger.error(`[errorHandler.handleDiscordError] 記錄 Discord 錯誤失敗: ${result.message}`);
                return null;
            }
        } catch (handlerError) {
            Logger.error(`[errorHandler.handleDiscordError] 處理 Discord 錯誤時發生異常:`, handlerError);
            return null;
        }
    }

    /**
     * 清理過期的錯誤記錄
     * @param {number} days - 保留天數
     * @returns {Promise<Object>} 清理結果
     */
    async cleanupExpiredErrors(days = 30) {
        try {
            Logger.info(`[errorHandler.cleanupExpiredErrors] 開始清理超過 ${days} 天的錯誤記錄`);
            return await this.errorHistoryService.cleanupOldErrors(days);
        } catch (error) {
            Logger.error(`[errorHandler.cleanupExpiredErrors] 清理過期錯誤記錄失敗:`, error);
            return {
                success: false,
                message: '清理失敗',
                deletedCount: 0
            };
        }
    }
}

module.exports = new errorHandler();