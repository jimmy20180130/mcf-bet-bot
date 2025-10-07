/**
 * 簡化的錯誤類別
 * 所有錯誤都繼承自這個基類
 */
class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.timestamp = Date.now();
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 驗證錯誤 - 參數不正確
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR');
        this.field = field;
    }
}

/**
 * 支付錯誤
 */
class PaymentError extends AppError {
    constructor(message, code = 'PAYMENT_ERROR', details = {}) {
        super(message, code);
        this.details = details;
    }

    // 快速創建常見錯誤的方法
    static insufficientBalance(currency, required, current) {
        return new PaymentError(
            `BOT ${currency === 'emerald' ? '綠寶石' : '村民錠'}餘額不足`,
            'INSUFFICIENT_BALANCE',
            { currency, required, current }
        );
    }

    static timeout(type, player, amount) {
        return new PaymentError('轉帳超時', 'PAYMENT_TIMEOUT', { type, player, amount });
    }

    static playerNotFound(playerId) {
        return new PaymentError('玩家不在同個分流或不存在', 'PLAYER_NOT_FOUND', { playerId });
    }

    static invalidAmount(amount) {
        return new PaymentError('金額無效或為小於等於零', 'INVALID_AMOUNT', { amount });
    }

    static botNotReady() {
        return new PaymentError('Bot 尚未啟動完畢', 'BOT_NOT_READY');
    }
}

/**
 * 下注錯誤
 */
class BetError extends AppError {
    constructor(message, code = 'BET_ERROR', details = {}) {
        super(message, code);
        this.details = details;
    }

    // 快速創建常見錯誤的方法
    static insufficientBalance(amount, currentBalance) {
        return new BetError('餘額不足，無法下注', 'INSUFFICIENT_BALANCE', { amount, currentBalance });
    }

    static redstoneNotFound() {
        return new BetError('找不到紅石粉', 'REDSTONE_NOT_FOUND');
    }

    static redstoneTimeout() {
        return new BetError('偵測結果超時，請稍後再試', 'REDSTONE_TIMEOUT');
    }

    static noPermission(action) {
        return new BetError(`Bot 沒有權限${action}`, 'NO_PERMISSION', { action });
    }

    static invalidAmount(amount) {
        return new BetError('下注金額無效', 'INVALID_AMOUNT', { amount });
    }

    static playerBlacklisted(reason) {
        return new BetError('玩家已被封鎖', 'PLAYER_BLACKLISTED', { reason });
    }
}

/**
 * 資料庫錯誤
 */
class DatabaseError extends AppError {
    constructor(message, code = 'DATABASE_ERROR') {
        super(message, code);
    }

    static notFound(resource, identifier) {
        return new DatabaseError(`找不到 ${resource}: ${identifier}`, 'NOT_FOUND');
    }

    static alreadyExists(resource, identifier) {
        return new DatabaseError(`${resource} 已存在: ${identifier}`, 'ALREADY_EXISTS');
    }
}

/**
 * 用戶錯誤
 */
class UserError extends AppError {
    constructor(message, code = 'USER_ERROR') {
        super(message, code);
    }

    static notFound(identifier) {
        return new UserError(`找不到用戶: ${identifier}`, 'USER_NOT_FOUND');
    }

    static uuidNotFound(playerId) {
        return new UserError(`無法取得 UUID: ${playerId}`, 'UUID_NOT_FOUND');
    }

    static eulaNotAccepted(playerId) {
        return new UserError(`用戶尚未接受使用條款: ${playerId}`, 'EULA_NOT_ACCEPTED');
    }
}

module.exports = {
    AppError,
    ValidationError,
    PaymentError,
    BetError,
    DatabaseError,
    UserError
};
