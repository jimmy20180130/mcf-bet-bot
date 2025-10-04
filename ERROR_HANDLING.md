# 統一錯誤處理系統使用指南

## 概述

本專案已實現統一的錯誤處理系統，統一了整個應用的錯誤處理方式。

## 核心組件

### 1. 錯誤類型 (`utils/errors.js`)

專案定義了以下錯誤類型：

- **AppError**: 基礎錯誤類型，所有自定義錯誤的父類
- **ValidationError**: 輸入驗證錯誤
- **PaymentError**: 支付相關錯誤
- **BetError**: 下注相關錯誤
- **DatabaseError**: 資料庫操作錯誤
- **UserError**: 用戶相關錯誤
- **PermissionError**: 權限錯誤

### 2. 錯誤處理服務 (`services/errorHandler.js`)

統一的錯誤處理入口，負責：
- 記錄錯誤到資料庫
- 構建用戶可讀的錯誤訊息
- 發送通知給玩家

### 3. 命令層輔助工具 (`utils/commandHandler.js`)

提供命令層的錯誤處理中介層和驗證工具。

## 使用方法

### 在 Repository 層

**舊方式 ❌:**
```javascript
async createUser(userData) {
    try {
        // 邏輯...
        return success;
    } catch (error) {
        Logger.error('創建用戶失敗:', error);
        return false;
    }
}
```

**新方式 ✅:**
```javascript
const { DatabaseError } = require('../utils/errors');

async createUser(userData) {
    // 直接拋出錯誤，讓調用者處理
    if (!playerUUID) {
        throw new DatabaseError('playerUUID 為必填欄位', 'MISSING_REQUIRED_FIELDS', 'create');
    }
    
    const existingUser = await this.getUserByUUID(playerUUID);
    if (existingUser) {
        throw DatabaseError.alreadyExists('用戶', playerUUID);
    }
    
    // ... 業務邏輯
    return user;
}
```

### 在 Service 層

**舊方式 ❌:**
```javascript
async pay(type, player, amount) {
    if (!this.bot) throw new Error('Bot 尚未啟動完畢');
    if (amount <= 0) throw new Error('無效的金額');
    // ...
}
```

**新方式 ✅:**
```javascript
const { PaymentError, ValidationError } = require('../utils/errors');

async pay(type, player, amount) {
    if (!this.bot) throw PaymentError.botNotReady();
    if (amount <= 0) throw PaymentError.invalidAmount(amount);
    
    // 使用靜態工廠方法創建特定錯誤
    if (balance < amount) {
        throw PaymentError.insufficientBalance(currency, amount, balance);
    }
    
    // ...
}
```

### 在 Command 層

**舊方式 ❌:**
```javascript
async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        bot.chat(`/m ${playerId} 用法錯誤`);
        return;
    }
    
    const amount = parseInt(parts[1]);
    if (isNaN(amount) || amount <= 0) {
        bot.chat(`/m ${playerId} &c金額必須為正整數`);
        return;
    }
    
    try {
        const result = await paymentService.epay(targetPlayer, amount);
        bot.chat(`/m ${playerId} 成功`);
    } catch (error) {
        bot.chat(`/m ${playerId} &c失敗: ${error.message}`);
    }
}
```

**新方式 ✅:**
```javascript
const { withErrorHandling, validateNumber } = require("../../utils/commandHandler");
const { ValidationError } = require("../../utils/errors");

async function execute(bot, playerId, args) {
    const parts = args.split(' ');
    if (parts.length !== 2) {
        throw new ValidationError('用法: epay <player> <amount>');
    }
    
    const targetPlayer = parts[0];
    // 使用驗證輔助函數
    const amount = validateNumber(parts[1], '金額', { min: 1, integer: true });
    
    if (!targetPlayer) {
        throw new ValidationError('目標玩家名稱無效', 'targetPlayer');
    }
    
    // 直接拋出錯誤，會被 withErrorHandling 自動捕獲並處理
    const result = await paymentService.epay(targetPlayer, amount);
    bot.chat(`/m ${playerId} 成功`);
}

module.exports = {
    name: 'epay',
    execute: withErrorHandling(execute),  // 包裝執行函數
}
```

## 錯誤處理最佳實踐

### 1. 使用適當的錯誤類型

根據錯誤的性質選擇正確的錯誤類型：

```javascript
// 驗證錯誤
throw new ValidationError('缺少必填參數: playerId', 'playerId');

// 支付錯誤
throw PaymentError.timeout('emerald', playerId, amount);

// 下注錯誤
throw BetError.redstoneNotFound();

// 資料庫錯誤
throw DatabaseError.notFound('用戶', uuid);

// 用戶錯誤
throw UserError.uuidNotFound(playerId);
```

### 2. 使用靜態工廠方法

許多錯誤類型提供了靜態工廠方法，方便創建常見錯誤：

```javascript
// PaymentError 工廠方法
PaymentError.insufficientBalance(currency, required, current)
PaymentError.timeout(type, player, amount)
PaymentError.playerNotFound(playerId)
PaymentError.invalidAmount(amount)
PaymentError.botNotReady()
PaymentError.cannotSendMessage()

// BetError 工廠方法
BetError.insufficientBalance(amount, currentBalance)
BetError.redstoneNotFound()
BetError.redstoneTimeout()
BetError.noPermission(action)
BetError.invalidAmount(amount)
BetError.playerBlacklisted(reason, unbanTime)

// DatabaseError 工廠方法
DatabaseError.notFound(resource, identifier)
DatabaseError.alreadyExists(resource, identifier)
DatabaseError.updateFailed(resource, identifier)
DatabaseError.deleteFailed(resource, identifier)

// UserError 工廠方法
UserError.notFound(identifier)
UserError.uuidNotFound(playerId)
UserError.alreadyExists(identifier)
UserError.notLinked(playerId)
UserError.eulaNotAccepted(playerId)
```

### 3. 在命令層使用 withErrorHandling

所有命令的 execute 函數都應該使用 `withErrorHandling` 包裝：

```javascript
module.exports = {
    name: 'myCommand',
    execute: withErrorHandling(async (bot, playerId, args) => {
        // 命令邏輯
        // 直接拋出錯誤，會自動被捕獲並處理
    })
}
```

### 4. 使用驗證輔助函數

命令層提供了多個驗證輔助函數：

```javascript
const { validateRequired, validateNumber, tryCatch } = require("../../utils/commandHandler");

// 驗證必填參數
validateRequired({ playerId, amount }, ['playerId', 'amount']);

// 驗證數字
const amount = validateNumber(value, '金額', { 
    min: 1, 
    max: 1000000, 
    integer: true 
});

// Try-catch 輔助
const user = await tryCatch(
    () => userRepository.getUserByUUID(uuid),
    null  // 失敗時返回 null
);
```

### 5. 錯誤記錄

所有操作性錯誤（AppError 及其子類）都會自動記錄到資料庫和日誌中。如需手動記錄：

```javascript
const errorHandler = require('../services/errorHandler');

try {
    // 某些操作
} catch (error) {
    await errorHandler.handleError(error, {
        bot,
        playerId,
        playerUUID,
        operation: 'operation_name',
        additionalInfo: { /* 額外資訊 */ }
    });
}
```

## 遷移指南

### 遷移現有代碼

1. **識別錯誤類型**: 確定代碼中拋出的錯誤屬於哪種類型
2. **替換錯誤**: 使用對應的自定義錯誤類型
3. **移除 try-catch**: 在命令層使用 `withErrorHandling`，讓錯誤向上傳播
4. **更新返回值**: Repository 和 Service 層應該拋出錯誤而不是返回 null/false

### 遷移檢查清單

- [ ] 導入所需的錯誤類型
- [ ] 替換 `throw new Error()` 為對應的錯誤類型
- [ ] 移除不必要的 try-catch
- [ ] 在命令層使用 `withErrorHandling`
- [ ] 使用驗證輔助函數
- [ ] 測試錯誤處理是否正常工作

## 常見問題

### Q: 什麼時候應該捕獲錯誤？

**A:** 只在以下情況捕獲錯誤：
- 需要進行錯誤恢復或重試
- 需要添加額外的上下文信息
- 需要將錯誤轉換為另一種類型

大多數情況下，應該讓錯誤向上傳播，由最上層統一處理。

### Q: Repository 層應該返回 null 還是拋出錯誤？

**A:** 視情況而定：
- **查詢方法**: 找不到數據時返回 `null`（這不是錯誤）
- **創建/更新/刪除方法**: 操作失敗時拋出錯誤

### Q: 如何處理第三方庫的錯誤？

**A:** 捕獲後轉換為我們的錯誤類型：

```javascript
try {
    await externalLibrary.doSomething();
} catch (error) {
    throw new AppError(
        `外部服務錯誤: ${error.message}`,
        'EXTERNAL_SERVICE_ERROR'
    );
}
```

### Q: 舊代碼需要立即遷移嗎？

**A:** 不需要。新的錯誤處理系統向後兼容：
- `errorHandler.handlePaymentError()` 和 `handleBetError()` 仍然可用（已標記為 deprecated）
- 可以逐步遷移，新代碼使用新系統
- 建議優先遷移核心功能和高頻調用的代碼

## 範例

完整的命令範例請參考：
- `commands/minecraft/epay.js` - 使用新錯誤處理系統的完整示範

Repository 範例請參考：
- `repositories/UserRepository.js` - 使用新錯誤處理的 Repository

Service 範例請參考：
- `services/paymentService.js` - 使用新錯誤處理的 Service
- `services/betService.js` - 下注相關錯誤處理

## 總結

統一的錯誤處理系統帶來的好處：

1. **一致性**: 整個應用的錯誤處理方式統一
2. **可維護性**: 錯誤處理邏輯集中，易於修改
3. **可追蹤性**: 所有錯誤都有唯一 ID，便於追蹤和調試
4. **用戶體驗**: 向用戶顯示友好的錯誤訊息
5. **代碼簡潔**: 減少重複的 try-catch 代碼

請在新代碼中優先使用新的錯誤處理系統！
