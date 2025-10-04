/**
 * 命令層錯誤處理中介層
 * 統一處理命令執行中的錯誤
 */
// TODO 是不是可以放到 commmands 資料夾裡面，但要注意循環引用的問題
const Logger = require('./logger');
const errorHandler = require('../services/errorHandler');
const { AppError, ValidationError, PaymentError, BetError, UserError, isOperationalError } = require('./errors');

/**
 * 包裝命令執行函數，自動處理錯誤
 * @param {Function} commandFn - 命令執行函數
 * @returns {Function} 包裝後的命令執行函數
 * 
 * @example
 * module.exports = {
 *     name: 'epay',
 *     execute: withErrorHandling(async (bot, playerId, args) => {
 *         // 命令邏輯...
 *         // 直接拋出錯誤，會自動被捕獲並處理
 *         if (!targetPlayer) {
 *             throw new ValidationError('目標玩家名稱無效', 'targetPlayer');
 *         }
 *     })
 * }
 */
function withErrorHandling(commandFn) {
    return async function(bot, playerId, args, ...extraArgs) {
        try {
            return await commandFn(bot, playerId, args, ...extraArgs);
        } catch (error) {
            await handleCommandError(bot, playerId, error, {
                command: commandFn.name || 'unknown',
                args
            });
        }
    };
}

/**
 * 處理命令執行中的錯誤
 * @param {Object} bot - Bot 實例
 * @param {string} playerId - 玩家 ID
 * @param {Error} error - 錯誤物件
 * @param {Object} context - 額外上下文
 */
async function handleCommandError(bot, playerId, error, context = {}) {
    try {
        Logger.error(`[CommandError] ${playerId} 命令執行失敗 [${context.command}]:`, error);
        
        // 構建錯誤訊息
        let errorMessage = '';
        
        if (error instanceof ValidationError) {
            errorMessage = `&c參數錯誤: ${error.message}`;
        } else if (error instanceof PaymentError) {
            errorMessage = `&c支付失敗: ${error.message}`;
        } else if (error instanceof BetError) {
            errorMessage = `&c下注失敗: ${error.message}`;
        } else if (error instanceof UserError) {
            errorMessage = `&c${error.message}`;
        } else if (isOperationalError(error)) {
            errorMessage = `&c${error.message}`;
        } else {
            // 未預期的錯誤，不顯示詳細訊息給用戶
            errorMessage = `&c執行命令時發生錯誤，請稍後再試`;
            Logger.error(`[CommandError] 未處理的錯誤類型:`, error);
        }
        
        // 發送錯誤訊息
        if (bot && playerId) {
            bot.chat(`/m ${playerId} ${errorMessage}`);
        }
        
        // 如果是操作性錯誤，記錄到錯誤歷史
        if (error instanceof AppError && isOperationalError(error)) {
            try {
                await errorHandler.handleError(error, {
                    bot,
                    playerId,
                    operation: `command:${context.command}`,
                    additionalInfo: context
                });
            } catch (handlerError) {
                Logger.error('[CommandError] 錯誤處理器失敗:', handlerError);
            }
        }
    } catch (handlerError) {
        Logger.error('[CommandError] 處理命令錯誤時發生異常:', handlerError);
        // 最後的保險：至少通知用戶出錯了
        if (bot && playerId) {
            bot.chat(`/m ${playerId} &c系統錯誤，請聯繫管理員`);
        }
    }
}

/**
 * Try-catch 輔助函數
 * 用於需要手動處理錯誤的場景
 * @param {Function} fn - 要執行的函數
 * @param {Object} fallback - 失敗時的返回值
 * @returns {Promise<any>} 執行結果或 fallback 值
 * 
 * @example
 * const user = await tryCatch(
 *     () => userRepository.getUserByUUID(uuid),
 *     null  // 失敗時返回 null
 * );
 */
async function tryCatch(fn, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        Logger.error('[tryCatch] 執行失敗:', error);
        return fallback;
    }
}

/**
 * 驗證必填參數
 * @param {Object} params - 參數物件
 * @param {string[]} required - 必填參數列表
 * @throws {ValidationError} 當缺少必填參數時
 * 
 * @example
 * validateRequired({ playerId, amount }, ['playerId', 'amount']);
 */
function validateRequired(params, required) {
    for (const field of required) {
        if (params[field] === undefined || params[field] === null || params[field] === '') {
            throw new ValidationError(`缺少必填參數: ${field}`, field);
        }
    }
}

/**
 * 驗證數字參數
 * @param {any} value - 要驗證的值
 * @param {string} fieldName - 欄位名稱
 * @param {Object} options - 驗證選項 { min, max, integer }
 * @returns {number} 驗證後的數字
 * @throws {ValidationError} 當驗證失敗時
 * 
 * @example
 * const amount = validateNumber(args[1], 'amount', { min: 1, integer: true });
 */
function validateNumber(value, fieldName, options = {}) {
    const { min, max, integer = false } = options;
    
    const num = Number(value);
    
    if (isNaN(num)) {
        throw new ValidationError(`${fieldName} 必須是數字`, fieldName);
    }
    
    if (integer && !Number.isInteger(num)) {
        throw new ValidationError(`${fieldName} 必須是整數`, fieldName);
    }
    
    if (min !== undefined && num < min) {
        throw new ValidationError(`${fieldName} 不能小於 ${min}`, fieldName);
    }
    
    if (max !== undefined && num > max) {
        throw new ValidationError(`${fieldName} 不能大於 ${max}`, fieldName);
    }
    
    return num;
}

module.exports = {
    withErrorHandling,
    handleCommandError,
    tryCatch,
    validateRequired,
    validateNumber
};
