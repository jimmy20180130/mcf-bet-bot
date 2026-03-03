const Logger = require('../../utils/logger');
const { errorRepository } = require('../../repositories');
const discordService = require('../discord/discordService');
const { PaymentError, BetError, UserError, DatabaseError, ValidationError } = require('../../utils/errors');

class ErrorHandler {
    async init() {
        Logger.debug('[ErrorHandler.init] 初始化 ErrorHandler');
    }

    async cleanup() {
        Logger.debug('[ErrorHandler.cleanup] 清理 ErrorHandler');
    }

    // options: { bot, operation, details }
    async handle(error, playerId, playerUUID, options = {}) {
        const { bot = null, operation = '未知操作', details = {} } = options;
        
        try {
            Logger.error(`[ErrorHandler] ${playerId} - ${operation}:`, error);

            discordService.sendErrorLog(error, `Operation: ${operation}, Player: ${playerId}`);

            const errorID = await this._saveError(error, playerUUID, operation, details);
            const userMessage = this._buildUserMessage(error, errorID);
            
            if (bot && playerId) {
                bot.chat(`/m ${playerId} ${userMessage}`);
            }
            
            return {
                errorID,
                message: error.message || '未知錯誤',
                userMessage
            };
            
        } catch (handlerError) {
            Logger.error('[ErrorHandler] 處理錯誤時失敗:', handlerError);
            
            if (bot && playerId) {
                bot.chat(`/m ${playerId} &c系統錯誤，請聯繫管理員`);
            }
            
            return {
                errorID: null,
                message: error.message || '未知錯誤',
                userMessage: '&c系統錯誤，請聯繫管理員'
            };
        }
    }
    
    async _saveError(error, playerUUID, operation, details) {
        try {
            // 提取錯誤類型
            const errorType = this._getErrorType(error);
            
            // 構建錯誤資料
            const errorData = {
                errorType,
                errorMessage: error.message || '未知錯誤',
                playerUUID,
                additionalInfo: {
                    operation,
                    errorCode: error.code || 'UNKNOWN',
                    timestamp: new Date().toISOString(),
                    ...details
                }
            };
            
            // 保存到資料庫
            const record = await errorRepository.createError(errorData);
            return record?.errorID || null;
            
        } catch (saveError) {
            Logger.error('[ErrorHandler._saveError] 保存錯誤失敗:', saveError);
            return null;
        }
    }
    
    _getErrorType(error) {
        if (error instanceof PaymentError) return 'PAYMENT_ERROR';
        if (error instanceof BetError) return 'BET_ERROR';
        if (error instanceof UserError) return 'USER_ERROR';
        if (error instanceof DatabaseError) return 'DATABASE_ERROR';
        if (error instanceof ValidationError) return 'VALIDATION_ERROR';
        return 'GENERAL_ERROR';
    }
    
    _buildUserMessage(error, errorID) {
        let message;
        
        const codeMessage = this._getMessageByCode(error.code);
        
        if (codeMessage) {
            if (error.code === 'VALIDATION_ERROR' && error.message) {
                message = `${codeMessage}: ${error.message}`;
            } else {
                message = codeMessage;
            }
        } else {
            message = `&c${error.message || '操作失敗'}`;
        }
        
        if (errorID) {
            message += ` &7(錯誤ID: ${errorID})`;
        }
        
        return message;
    }
    
    _getMessageByCode(code) {
        const messages = {
            // 支付錯誤
            'INSUFFICIENT_BALANCE': '&c餘額不足',
            'PAYMENT_TIMEOUT': '&c轉帳超時，請稍後再試',
            'PLAYER_NOT_FOUND': '&c找不到目標玩家或不在同個分流',
            'INVALID_AMOUNT': '&c金額無效',
            'BOT_NOT_READY': '&cBot 尚未準備好',
            
            // 下注錯誤
            'REDSTONE_NOT_FOUND': '&c找不到紅石粉',
            'REDSTONE_TIMEOUT': '&c偵測結果超時，請稍後再試',
            'NO_PERMISSION': '&cBot 沒有權限執行操作',
            'PLAYER_BLACKLISTED': '&c您已被封鎖使用本機器人',
            
            // 用戶錯誤
            'UUID_NOT_FOUND': '&c無法取得您的 UUID',
            'EULA_NOT_ACCEPTED': '&c您尚未接受使用條款',
            'USER_NOT_FOUND': '&c找不到用戶資料',
            
            // 資料庫錯誤
            'DATABASE_ERROR': '&c資料庫錯誤',
            'NOT_FOUND': '&c找不到資料',
            
            // 驗證錯誤
            'VALIDATION_ERROR': '&c參數錯誤'
        };
        
        return messages[code] || null;
    }
}

const errorHandler = new ErrorHandler();
errorHandler.name = 'errorHandler';

module.exports = errorHandler;