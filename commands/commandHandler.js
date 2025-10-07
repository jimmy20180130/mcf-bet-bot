/**
 * 命令層錯誤處理
 * 統一處理命令執行中的錯誤
 */
const Logger = require('../utils/logger');
const errorHandler = require('../services/general/errorHandler');
const userInfoService = require('../services/general/userInfoService');
const { ValidationError } = require('../utils/errors');

/**
 * 包裝命令執行函數，自動處理錯誤
 * @param {string} commandName - 命令名稱
 * @param {Function} commandFn - 命令執行函數
 * @returns {Function} 包裝後的命令執行函數
 */
function withErrorHandling(commandName, commandFn) {
    return async function(bot, playerId, args, ...extraArgs) {
        try {
            return await commandFn(bot, playerId, args, ...extraArgs);
        } catch (error) {
            await handleCommandError(bot, playerId, error, {
                command: commandName,
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
        // 獲取玩家 UUID
        const playerUUID = await userInfoService.getMinecraftUUID(playerId).catch(() => null);
        
        // 使用新的簡化錯誤處理器
        await errorHandler.handle(error, playerId, playerUUID, {
            bot,
            operation: `command:${context.command}`,
            details: context
        });
        
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
 * @param {Object} params - 參數物件 (例如 { targetPlayer: 'Jimmy4Real', amount: '100' })
 * @param {Array<string>} required - 必填參數名稱陣列 (例如 ['targetPlayer', 'amount'])
 * @returns {Object} 驗證通過的參數物件
 * @throws {ValidationError} 如果缺少必填參數，則拋出錯誤
 */
function validateRequired(params, required) {
    for (const field of required) {
        if (params[field] === undefined || params[field] === null || params[field] === '') {
            throw new ValidationError(`缺少必填參數: ${field}`, field);
        }
    }

    return params;
}

/**
 * 驗證數字參數
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
