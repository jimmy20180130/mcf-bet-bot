const Logger = require('../../utils/logger');
const { errorRepository } = require('../../repositories');

/**
 * 簡單的錯誤處理器
 * 目標：遇到錯誤只通知用戶一次，包含錯誤 ID 和原因
 */
class ErrorHandler {
    /**
     * 處理錯誤 - 唯一的入口
     * @param {Error} error - 錯誤物件
     * @param {string} playerId - 玩家 ID
     * @param {string} playerUUID - 玩家 UUID
     * @param {Object} options - 選項 { bot, operation, details }
     * @returns {Object} { errorID, message, userMessage }
     */
    async handle(error, playerId, playerUUID, options = {}) {
        const { bot = null, operation = '未知操作', details = {} } = options;
        
        try {
            // 1. 記錄到 console
            Logger.error(`[ErrorHandler] ${playerId} - ${operation}:`, error);
            
            // 2. 記錄到資料庫，生成錯誤 ID
            const errorID = await this._saveError(error, playerUUID, operation, details);
            
            // 3. 構建用戶訊息
            const userMessage = this._buildUserMessage(error, errorID);
            
            // 4. 通知用戶（只通知一次）
            if (bot && playerId) {
                bot.chat(`/m ${playerId} ${userMessage}`);
            }
            
            return {
                errorID,
                message: error.message || '未知錯誤',
                userMessage
            };
            
        } catch (handlerError) {
            // 錯誤處理器本身出錯，至少記錄並通知
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
    
    /**
     * 記錄錯誤到資料庫
     * @private
     */
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
    
    /**
     * 獲取錯誤類型
     * @private
     */
    _getErrorType(error) {
        if (error.type) return error.type;
        if (error.code) {
            if (error.code.includes('PAYMENT')) return 'PAYMENT_ERROR';
            if (error.code.includes('BET')) return 'BET_ERROR';
            if (error.code.includes('USER')) return 'USER_ERROR';
            if (error.code.includes('DATABASE')) return 'DATABASE_ERROR';
        }
        return 'GENERAL_ERROR';
    }
    
    /**
     * 構建用戶可讀的錯誤訊息
     * @private
     */
    _buildUserMessage(error, errorID) {
        let message;
        
        // 根據錯誤代碼獲取基礎訊息
        const codeMessage = this._getMessageByCode(error.code);
        
        if (codeMessage) {
            // 如果是驗證錯誤，附加具體錯誤訊息
            if (error.code === 'VALIDATION_ERROR' && error.message) {
                message = `${codeMessage}: ${error.message}`;
            } else {
                message = codeMessage;
            }
        } else {
            // 沒有對應的錯誤碼訊息，直接使用錯誤訊息
            message = `&c${error.message || '操作失敗'}`;
        }
        
        // 添加錯誤 ID
        if (errorID) {
            message += ` &7(錯誤ID: ${errorID})`;
        }
        
        return message;
    }
    
    /**
     * 根據錯誤代碼獲取用戶友好訊息
     * @private
     */
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

module.exports = new ErrorHandler();