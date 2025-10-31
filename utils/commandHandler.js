const Logger = require('./logger');
const errorHandler = require('../services/general/errorHandler');
const userInfoService = require('../services/general/userInfoService');
const { ValidationError } = require('./errors');
//TODO: add discord command handler

// 統一 Minecraft 指令的錯誤處理
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

async function handleCommandError(bot, playerId, error, context = {}) {
    try {
        const playerUUID = await userInfoService.getMinecraftUUID(playerId).catch(() => null);

        await errorHandler.handle(error, playerId, playerUUID, {
            bot,
            operation: `command:${context.command}`,
            details: context
        });
        
    } catch (handlerError) {
        Logger.error('[CommandError] 處理命令錯誤時發生異常:', handlerError);

        if (bot && playerId) {
            bot.chat(`/m ${playerId} &c系統錯誤，請聯繫管理員`);
        }
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
    validateRequired,
    validateNumber
};
