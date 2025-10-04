# 錯誤處理系統重構總結

## 完成的工作

### 1. 創建統一的錯誤類型系統 (`utils/errors.js`)

定義了 7 種自定義錯誤類型：
- **AppError**: 基礎錯誤類別，所有自定義錯誤的父類
- **ValidationError**: 輸入驗證錯誤
- **PaymentError**: 支付相關錯誤（含 6 個靜態工廠方法）
- **BetError**: 下注相關錯誤（含 6 個靜態工廠方法）
- **DatabaseError**: 資料庫操作錯誤（含 4 個靜態工廠方法）
- **UserError**: 用戶相關錯誤（含 5 個靜態工廠方法）
- **PermissionError**: 權限錯誤

每個錯誤類型都包含：
- 錯誤代碼 (code)
- HTTP 狀態碼 (statusCode)
- 是否為操作性錯誤 (isOperational)
- 時間戳 (timestamp)
- toJSON() 方法用於序列化

### 2. 增強錯誤處理服務 (`services/errorHandler.js`)

新增功能：
- **handleError()**: 統一的錯誤處理入口，自動處理所有錯誤類型
- **_logError()**: 根據錯誤類型自動選擇記錄方法
- **_buildUserMessage()**: 根據錯誤類型構建用戶友好的錯誤訊息

保持向後兼容：
- `handlePaymentError()` 和 `handleBetError()` 標記為 deprecated，但仍可使用
- 這些方法內部已重構為使用新的 `handleError()` 方法

### 3. 更新 Repository 層 (`repositories/UserRepository.js`)

變更：
- 導入錯誤類型：`DatabaseError`, `UserError`
- **createUser()**: 拋出 `DatabaseError` 而不是返回 false
- **updateUser()**: 拋出 `DatabaseError` 而不是返回 false
- **updateWallet()**: 拋出 `DatabaseError` 而不是返回 null
- **查詢方法**: 保持返回 null（查詢不到不是錯誤）

好處：
- 調用者可以明確知道操作失敗的原因
- 統一的錯誤處理方式
- 更好的類型安全性

### 4. 更新 Service 層

#### `services/paymentService.js`
- 導入 `PaymentError` 和 `ValidationError`
- 使用 `PaymentError` 的靜態工廠方法
- 所有驗證錯誤使用 `ValidationError`
- 錯誤處理更加精確和類型安全

#### `services/betService.js`
- 導入 `BetError` 和 `UserError`
- `_clickRedstoneDust()` 使用 `BetError` 的靜態工廠方法
- 紅石粉相關錯誤統一處理

### 5. 創建命令層輔助工具 (`utils/commandHandler.js`)

提供的工具：
- **withErrorHandling()**: 高階函數，自動捕獲和處理命令中的錯誤
- **handleCommandError()**: 統一處理命令層錯誤
- **tryCatch()**: Try-catch 輔助函數
- **validateRequired()**: 驗證必填參數
- **validateNumber()**: 驗證數字參數（支持 min, max, integer 選項）

### 6. 更新命令層範例 (`commands/minecraft/epay.js`)

展示新系統的使用方式：
- 使用 `withErrorHandling()` 包裝 execute 函數
- 使用 `validateNumber()` 驗證數字參數
- 直接拋出 `ValidationError`，不再手動處理
- 代碼更加簡潔和易維護

### 7. 創建完整文檔 (`ERROR_HANDLING.md`)

包含：
- 系統概述
- 核心組件說明
- 各層使用方法（舊方式 vs 新方式對比）
- 最佳實踐
- 遷移指南
- 常見問題
- 完整範例

## 系統優勢

### 1. **一致性**
- 整個應用使用統一的錯誤處理方式
- 錯誤訊息格式統一
- 減少代碼重複

### 2. **類型安全**
- 使用專門的錯誤類型而不是通用 Error
- IDE 可以提供更好的自動完成
- 更容易發現和修復錯誤

### 3. **可追蹤性**
- 所有錯誤都有唯一的錯誤 ID
- 自動記錄到資料庫
- 包含完整的上下文信息

### 4. **用戶體驗**
- 根據錯誤類型提供友好的錯誤訊息
- 區分操作性錯誤和程式 bug
- 自動處理錢包退款等業務邏輯

### 5. **可維護性**
- 錯誤處理邏輯集中管理
- 易於修改和擴展
- 代碼更加簡潔

### 6. **向後兼容**
- 舊代碼仍然可以正常運行
- 可以逐步遷移
- 不會影響現有功能

## 使用建議

### 立即採用
新功能和新代碼應該使用新的錯誤處理系統。

### 逐步遷移
對於現有代碼：
1. **優先級 1**: 核心功能（支付、下注）
2. **優先級 2**: 高頻調用的功能
3. **優先級 3**: 其他功能

### 遷移步驟
1. 閱讀 `ERROR_HANDLING.md`
2. 參考 `commands/minecraft/epay.js` 範例
3. 導入所需的錯誤類型
4. 替換錯誤拋出方式
5. 在命令層使用 `withErrorHandling`
6. 測試確保功能正常

## 後續工作建議

### 短期
1. 遷移其他命令文件（cpay, daily, deposit 等）
2. 更新其他 Repository（BetRepository, PaymentRepository 等）
3. 更新其他 Service（rankService, ticketService 等）

### 中期
1. 添加錯誤統計和監控
2. 在 Discord 中顯示錯誤通知
3. 實現錯誤恢復機制（如自動重試）

### 長期
1. 建立錯誤處理的單元測試
2. 實現錯誤分析和報告功能
3. 根據錯誤數據優化系統

## 文件清單

### 新增文件
- `utils/errors.js` - 錯誤類型定義
- `utils/commandHandler.js` - 命令層輔助工具
- `ERROR_HANDLING.md` - 使用文檔
- `ERROR_HANDLING_SUMMARY.md` - 本總結文檔（你正在閱讀）

### 修改文件
- `services/errorHandler.js` - 增強功能，保持向後兼容
- `repositories/UserRepository.js` - 使用新錯誤類型
- `services/paymentService.js` - 使用新錯誤類型
- `services/betService.js` - 使用新錯誤類型
- `commands/minecraft/epay.js` - 示範新用法

## 技術細節

### 錯誤傳播流程

```
Command Layer (拋出錯誤)
    ↓
withErrorHandling (捕獲錯誤)
    ↓
handleCommandError (處理錯誤)
    ↓
errorHandler.handleError (記錄錯誤)
    ↓
發送通知給用戶
```

### 錯誤類型層次

```
Error (JS 內建)
  ↓
AppError (基礎類)
  ├─ ValidationError (驗證錯誤)
  ├─ PaymentError (支付錯誤)
  ├─ BetError (下注錯誤)
  ├─ DatabaseError (資料庫錯誤)
  ├─ UserError (用戶錯誤)
  └─ PermissionError (權限錯誤)
```

## 結語

這次重構建立了一個完整、統一且易於使用的錯誤處理系統。系統設計考慮了向後兼容性，可以讓你逐步遷移現有代碼。

新系統不僅提高了代碼質量和可維護性，還改善了用戶體驗和錯誤追蹤能力。

建議團隊成員閱讀 `ERROR_HANDLING.md` 並在新代碼中採用新系統。如有任何問題，請參考文檔或查看範例代碼。

**Happy Coding! 🚀**
