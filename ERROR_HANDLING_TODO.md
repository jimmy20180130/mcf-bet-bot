# 錯誤處理系統遷移待辦清單

## 已完成 ✅

### 核心文件
- ✅ `utils/errors.js` - 錯誤類型定義
- ✅ `utils/commandHandler.js` - 命令層輔助工具
- ✅ `services/errorHandler.js` - 統一錯誤處理服務
- ✅ `services/paymentService.js` - 使用新錯誤類型
- ✅ `services/betService.js` - 使用新錯誤類型
- ✅ `repositories/UserRepository.js` - 拋出明確錯誤

### 命令文件
- ✅ `commands/minecraft/epay.js` - 完整範例

### 文檔
- ✅ `ERROR_HANDLING.md` - 使用指南
- ✅ `ERROR_HANDLING_SUMMARY.md` - 重構總結

---

## 待更新 - Service 層 🔴

### 高優先級（核心功能）

#### 1. `services/userInfoService.js` ⚠️ 需要更新
**問題：**
- 使用通用 `Error` 而不是自定義錯誤類型
- 錯誤處理不一致（有些返回 null，有些返回錯誤對象）
- 缺少統一的錯誤傳播

**建議改進：**
```javascript
// 導入錯誤類型
const { UserError, AppError } = require('../utils/errors');

// 將錯誤改為拋出自定義類型
async getMinecraftUUID(playerid) {
    // ...
    if (!response.ok) {
        throw new AppError(
            `Minecraft API 請求失敗: ${response.status}`,
            'MINECRAFT_API_ERROR',
            response.status
        );
    }
    
    if (data.errorMessage || !data.id) {
        throw UserError.uuidNotFound(playerid);
    }
    // ...
}

async syncUserInfo(playerUUID) {
    const existingUser = await this.userRepository.getUserByUUID(playerUUID);
    if (!existingUser) {
        throw UserError.notFound(playerUUID);
    }
    // ... 直接拋出錯誤，不要包裝在 try-catch 返回錯誤對象
}
```

#### 2. `services/rankService.js` ⚠️ 需要更新
**問題：**
- 所有方法都返回 `{ success, message }` 格式
- 內部使用 try-catch 包裝，隱藏了真實錯誤
- 應該拋出錯誤而不是返回錯誤對象

**建議改進：**
```javascript
const { DatabaseError, ValidationError } = require('../utils/errors');

async createRank(rankData) {
    // 驗證
    if (!rankData.rankID || !rankData.rankName) {
        throw new ValidationError('等級 ID 和名稱為必填欄位');
    }
    
    // 檢查重複
    const existingRank = await this.rankRepository.getRankByID(rankData.rankID);
    if (existingRank) {
        throw DatabaseError.alreadyExists('等級', rankData.rankID);
    }
    
    // 創建，失敗時自動拋出錯誤
    const success = await this.rankRepository.createRank(rankData);
    if (!success) {
        throw DatabaseError.updateFailed('等級', rankData.rankID);
    }
    
    // 成功時直接返回數據，不需要包裝在 { success, message } 中
    return rankData;
}
```

#### 3. `services/blacklistService.js` ⚠️ 需要更新
**問題：**
- 錯誤處理混亂（有時拋出，有時返回）
- 缺少輸入驗證
- 註釋說"這裡不用處理丟出來的 error"，但實際上應該處理

**建議改進：**
```javascript
const { UserError, ValidationError } = require('../utils/errors');

async isBlacklisted(playerID) {
    if (!playerID) {
        throw new ValidationError('玩家 ID 為必填', 'playerID');
    }
    
    // 讓錯誤自然傳播
    const playerUUID = await userinfoService.getMinecraftUUID(playerID);
    let user = await userRepository.getUserByUUID(playerUUID);
    
    if (!user) {
        // 創建用戶
        user = await userRepository.createUser({ 
            playerUUID, 
            playerID 
        });
    }
    
    // ... 返回黑名單狀態
}
```

#### 4. `services/ticketService.js` ⚠️ 需要更新
**問題：**
- 大量使用 `{ success, message }` 返回格式
- 驗證邏輯應該拋出 `ValidationError`
- 錯誤被內部捕獲，調用者無法知道真實原因

**建議改進：**
```javascript
const { ValidationError, DatabaseError, UserError } = require('../utils/errors');

async createTicket(ticketData) {
    // 驗證（直接拋出錯誤）
    this._validateTicketDataOrThrow(ticketData);
    
    // 創建
    const success = await this.ticketRepository.createTicket(ticketData);
    if (!success) {
        throw DatabaseError.updateFailed('票券', ticketData.ticketID);
    }
    
    // 返回創建的數據
    return ticketData;
}

async claimTicket(playerUUID, ticketID, password) {
    const user = await this.userRepository.getUserByUUID(playerUUID);
    if (!user) {
        throw UserError.notFound(playerUUID);
    }
    
    if (user.additionalInfo?.isBlacklisted) {
        throw UserError.playerBlacklisted();
    }
    
    // ... 驗證和發放，失敗時拋出錯誤
}

_validateTicketDataOrThrow(ticketData) {
    if (!ticketData.ticketID) {
        throw new ValidationError('票券 ID 為必填', 'ticketID');
    }
    // ...
}
```

### 中優先級（輔助功能）

#### 5. `services/authService.js` - 需要檢查
- 需要檢查內容並更新

#### 6. `services/teleportService.js` - 需要檢查
- 需要檢查內容並更新

#### 7. `services/linkService.js` - 幾乎是空的
```javascript
class LinkService {
    constructor() {
        this.verifyCode = []
    }
}
```
- 暫時不需要更新

#### 8. `services/errorHistoryService.js` - 需要檢查
- 這是錯誤記錄服務，需要檢查是否需要更新

#### 9. `services/databaseService.js` - 需要檢查
- 底層服務，需要檢查是否需要拋出 `DatabaseError`

---

## 待更新 - Command 層 🔴

### Minecraft 命令

#### 已完成
- ✅ `commands/minecraft/epay.js`

#### 需要更新

1. **`commands/minecraft/cpay.js`** ⚠️ 高優先級
   - 與 `epay.js` 類似，需要使用 `withErrorHandling`
   - 使用 `validateNumber` 驗證金額

2. **`commands/minecraft/daily.js`** ⚠️ 高優先級
   - 已檢查過，有很多 try-catch
   - 應該使用 `withErrorHandling` 包裝
   - 讓錯誤自然傳播

3. **`commands/minecraft/wallet.js`** ⚠️ 高優先級
   - 核心功能，需要更新
   - 錯誤處理混亂
   - 應該使用統一錯誤處理

4. **`commands/minecraft/deposit.js`** ⚠️ 中優先級
   - 使用 Map 追蹤待處理存款
   - 較簡單，主要是狀態管理
   - 可以使用 `withErrorHandling` 包裝

5. **`commands/minecraft/money.js`** ⚠️ 低優先級
   - 只是顯示餘額
   - 幾乎不需要錯誤處理
   - 可以快速更新

6. **`commands/minecraft/link.js`** - 需要檢查

7. **`commands/minecraft/help.js`** - 可能不需要錯誤處理

8. **`commands/minecraft/reload.js`** - 需要檢查

9. **`commands/minecraft/agreeEULA.js`** - 需要檢查

10. **`commands/minecraft/example.js`** - 可能是範例文件

### Discord 命令

11. **`commands/discord/record.js`** - 需要檢查

12. **`commands/discord/settings.js`** - 需要檢查

---

## 更新建議優先順序

### 第一階段（立即處理）
1. ✅ `services/paymentService.js` - 已完成
2. ✅ `services/betService.js` - 已完成
3. ✅ `commands/minecraft/epay.js` - 已完成
4. 🔴 `commands/minecraft/cpay.js` - 與 epay 類似
5. 🔴 `commands/minecraft/wallet.js` - 核心功能
6. 🔴 `commands/minecraft/daily.js` - 核心功能

### 第二階段（重要功能）
7. 🔴 `services/userInfoService.js` - 用戶信息服務
8. 🔴 `services/rankService.js` - 等級服務
9. 🔴 `services/blacklistService.js` - 黑名單服務
10. 🔴 `services/ticketService.js` - 票券服務

### 第三階段（輔助功能）
11. 🔴 其他命令文件
12. 🔴 其他服務文件

---

## 更新檢查清單

對每個文件執行以下檢查：

### Service 層
- [ ] 導入所需的錯誤類型
- [ ] 移除內部 try-catch，讓錯誤向上傳播
- [ ] 將 `throw new Error()` 改為對應的錯誤類型
- [ ] 將返回 `{ success, message }` 格式改為直接拋出錯誤或返回數據
- [ ] 驗證邏輯使用 `ValidationError`
- [ ] 資料庫錯誤使用 `DatabaseError`
- [ ] 查詢不到數據時返回 `null`（不是錯誤），操作失敗時拋出錯誤

### Command 層
- [ ] 導入 `withErrorHandling` 和驗證函數
- [ ] 使用 `withErrorHandling` 包裝 execute 函數
- [ ] 移除內部 try-catch
- [ ] 使用 `validateNumber`, `validateRequired` 等驗證函數
- [ ] 直接拋出 `ValidationError` 而不是手動發送錯誤訊息
- [ ] 讓 Service 層的錯誤自然傳播

---

## 範例對照

### ❌ 舊方式（Service 層）
```javascript
async createRank(rankData) {
    try {
        if (!rankData.rankID) {
            throw new Error('等級 ID 為必填');
        }
        // ...
        return { success: true, message: '成功', rankData };
    } catch (error) {
        Logger.error('創建失敗:', error);
        return { success: false, message: error.message };
    }
}
```

### ✅ 新方式（Service 層）
```javascript
const { ValidationError, DatabaseError } = require('../utils/errors');

async createRank(rankData) {
    if (!rankData.rankID) {
        throw new ValidationError('等級 ID 為必填', 'rankID');
    }
    
    const existing = await this.repository.getRankByID(rankData.rankID);
    if (existing) {
        throw DatabaseError.alreadyExists('等級', rankData.rankID);
    }
    
    const success = await this.repository.createRank(rankData);
    if (!success) {
        throw DatabaseError.updateFailed('等級', rankData.rankID);
    }
    
    return rankData; // 直接返回數據
}
```

### ❌ 舊方式（Command 層）
```javascript
async function execute(bot, playerId, args) {
    if (args.length < 1) {
        bot.chat(`/m ${playerId} 參數錯誤`);
        return;
    }
    
    try {
        const result = await service.doSomething(args);
        bot.chat(`/m ${playerId} 成功`);
    } catch (error) {
        bot.chat(`/m ${playerId} &c失敗: ${error.message}`);
    }
}
```

### ✅ 新方式（Command 層）
```javascript
const { withErrorHandling, validateRequired } = require('../../utils/commandHandler');
const { ValidationError } = require('../../utils/errors');

async function execute(bot, playerId, args) {
    if (args.length < 1) {
        throw new ValidationError('缺少必要參數');
    }
    
    // 直接調用，錯誤會被 withErrorHandling 捕獲
    const result = await service.doSomething(args);
    bot.chat(`/m ${playerId} 成功`);
}

module.exports = {
    name: 'myCommand',
    execute: withErrorHandling(execute)
}
```

---

## 總結

**統計：**
- ✅ 已完成：6 個文件
- 🔴 需要更新：約 15-20 個文件
- ⚠️ 高優先級：6 個文件
- ⚠️ 中優先級：4-6 個文件
- ⚠️ 低優先級：其餘文件

**建議：**
1. 先完成高優先級的 Command 層（cpay, wallet, daily）
2. 然後更新核心 Service 層（userInfoService, rankService）
3. 最後處理輔助功能

**預估工作量：**
- 每個文件約需要 10-30 分鐘
- 總計約需要 4-8 小時完成所有遷移

**注意事項：**
- 每更新一個文件，都應該測試相關功能
- 可以逐步遷移，不必一次全部完成
- 保持向後兼容性，舊代碼仍然可以運行
