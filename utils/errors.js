/**
 * 統一的錯誤處理類別
 * 定義專案中所有自定義錯誤類型
 */

/**
 * 基礎應用錯誤類別
 * 所有自定義錯誤的基類
 */
class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational; // 區分可預期的錯誤和程式 bug
        this.timestamp = Date.now();
        
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp
        };
    }
}

/**
 * 驗證錯誤
 * 用於輸入驗證失敗的情況
 */
class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR', 400);
        this.field = field;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            field: this.field
        };
    }
}

/**
 * 支付相關錯誤
 * 用於支付流程中的各種錯誤
 */
class PaymentError extends AppError {
    constructor(message, code = 'PAYMENT_ERROR', paymentDetails = {}) {
        super(message, code, 500);
        this.paymentDetails = paymentDetails;
    }

    static insufficientBalance(currency, required, current) {
        return new PaymentError(
            `BOT ${currency === 'emerald' ? '綠寶石' : '村民錠'}餘額不足`,
            'INSUFFICIENT_BALANCE',
            { currency, required, current }
        );
    }

    static timeout(type, player, amount) {
        return new PaymentError(
            '轉帳超時',
            'PAYMENT_TIMEOUT',
            { type, player, amount }
        );
    }

    static playerNotFound(playerId) {
        return new PaymentError(
            '玩家不在同個分流或不存在',
            'PLAYER_NOT_FOUND',
            { playerId }
        );
    }

    static invalidAmount(amount) {
        return new PaymentError(
            '金額無效或為小於等於零',
            'INVALID_AMOUNT',
            { amount }
        );
    }

    static botNotReady() {
        return new PaymentError(
            'Bot 尚未啟動完畢',
            'BOT_NOT_READY'
        );
    }

    static cannotSendMessage() {
        return new PaymentError(
            'Bot 無法發送訊息或無法使用指令',
            'CANNOT_SEND_MESSAGE'
        );
    }

    toJSON() {
        return {
            ...super.toJSON(),
            paymentDetails: this.paymentDetails
        };
    }
}

/**
 * 下注相關錯誤
 * 用於下注流程中的各種錯誤
 */
class BetError extends AppError {
    constructor(message, code = 'BET_ERROR', betDetails = {}) {
        super(message, code, 500);
        this.betDetails = betDetails;
    }

    static insufficientBalance(amount, currentBalance) {
        return new BetError(
            '餘額不足，無法下注',
            'INSUFFICIENT_BALANCE',
            { amount, currentBalance }
        );
    }

    static redstoneNotFound() {
        return new BetError(
            '找不到紅石粉',
            'REDSTONE_NOT_FOUND'
        );
    }

    static redstoneTimeout() {
        return new BetError(
            '偵測結果超時，請稍後再試',
            'REDSTONE_TIMEOUT'
        );
    }

    static noPermission(action) {
        return new BetError(
            `Bot 沒有權限${action}`,
            'NO_PERMISSION',
            { action }
        );
    }

    static invalidAmount(amount) {
        return new BetError(
            '下注金額無效',
            'INVALID_AMOUNT',
            { amount }
        );
    }

    static playerBlacklisted(reason, unbanTime) {
        return new BetError(
            '玩家已被封鎖',
            'PLAYER_BLACKLISTED',
            { reason, unbanTime }
        );
    }

    toJSON() {
        return {
            ...super.toJSON(),
            betDetails: this.betDetails
        };
    }
}

/**
 * 資料庫相關錯誤
 * 用於資料庫操作失敗的情況
 */
class DatabaseError extends AppError {
    constructor(message, code = 'DATABASE_ERROR', operation = null) {
        super(message, code, 500);
        this.operation = operation;
    }

    static notFound(resource, identifier) {
        return new DatabaseError(
            `找不到 ${resource}: ${identifier}`,
            'NOT_FOUND',
            'read'
        );
    }

    static alreadyExists(resource, identifier) {
        return new DatabaseError(
            `${resource} 已存在: ${identifier}`,
            'ALREADY_EXISTS',
            'create'
        );
    }

    static updateFailed(resource, identifier) {
        return new DatabaseError(
            `更新 ${resource} 失敗: ${identifier}`,
            'UPDATE_FAILED',
            'update'
        );
    }

    static deleteFailed(resource, identifier) {
        return new DatabaseError(
            `刪除 ${resource} 失敗: ${identifier}`,
            'DELETE_FAILED',
            'delete'
        );
    }

    toJSON() {
        return {
            ...super.toJSON(),
            operation: this.operation
        };
    }
}

/**
 * 用戶相關錯誤
 * 用於用戶操作的各種錯誤
 */
class UserError extends AppError {
    constructor(message, code = 'USER_ERROR', userId = null) {
        super(message, code, 400);
        this.userId = userId;
    }

    static notFound(identifier) {
        return new UserError(
            `找不到用戶: ${identifier}`,
            'USER_NOT_FOUND',
            identifier
        );
    }

    static uuidNotFound(playerId) {
        return new UserError(
            `無法取得 UUID: ${playerId}`,
            'UUID_NOT_FOUND',
            playerId
        );
    }

    static alreadyExists(identifier) {
        return new UserError(
            `用戶已存在: ${identifier}`,
            'USER_ALREADY_EXISTS',
            identifier
        );
    }

    static notLinked(playerId) {
        return new UserError(
            `用戶尚未連結 Discord: ${playerId}`,
            'USER_NOT_LINKED',
            playerId
        );
    }

    static eulaNotAccepted(playerId) {
        return new UserError(
            `用戶尚未接受使用條款: ${playerId}`,
            'EULA_NOT_ACCEPTED',
            playerId
        );
    }

    toJSON() {
        return {
            ...super.toJSON(),
            userId: this.userId
        };
    }
}

/**
 * 權限相關錯誤
 * 用於權限檢查失敗的情況
 */
class PermissionError extends AppError {
    constructor(message, requiredLevel = null, currentLevel = null) {
        super(message, 'PERMISSION_DENIED', 403);
        this.requiredLevel = requiredLevel;
        this.currentLevel = currentLevel;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            requiredLevel: this.requiredLevel,
            currentLevel: this.currentLevel
        };
    }
}

/**
 * 檢查錯誤是否為操作性錯誤（可預期的錯誤）
 * @param {Error} error - 錯誤物件
 * @returns {boolean} 是否為操作性錯誤
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * 從錯誤中提取有用的資訊
 * @param {Error} error - 錯誤物件
 * @returns {Object} 錯誤資訊
 */
function extractErrorInfo(error) {
    if (error instanceof AppError) {
        return error.toJSON();
    }
    
    return {
        name: error.name || 'Error',
        code: 'UNKNOWN_ERROR',
        message: error.message || '未知錯誤',
        statusCode: 500,
        timestamp: Date.now()
    };
}

module.exports = {
    AppError,
    ValidationError,
    PaymentError,
    BetError,
    DatabaseError,
    UserError,
    PermissionError,
    isOperationalError,
    extractErrorInfo
};
