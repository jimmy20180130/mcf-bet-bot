# MCF Bet Bot 開發規格文檔

> **版本**: 1.0.0  
> **最後更新**: 2025-10-03  
> **目的**: 建立統一的開發標準，確保程式碼品質與可維護性

---

## 📋 目錄

1. [專案架構](#專案架構)
2. [程式碼風格](#程式碼風格)
3. [命名規範](#命名規範)
4. [錯誤處理](#錯誤處理)
5. [服務層規範](#服務層規範)
6. [指令開發規範](#指令開發規範)
7. [資料庫操作](#資料庫操作)
8. [日誌規範](#日誌規範)
9. [測試規範](#測試規範)
10. [安全規範](#安全規範)
11. [效能考量](#效能考量)

---

## 🏗️ 專案架構

### 目錄結構說明

```
mcf-bet-bot/
├── commands/           # 指令處理層（Command Layer）
│   ├── index.js       # 指令路由器
│   ├── discord/       # Discord 指令
│   └── minecraft/     # Minecraft 指令
├── core/              # 核心系統層（Core Layer）
│   ├── client.js      # 事件中心
│   ├── core.js        # 應用程式進入點
│   ├── dcBot.js       # Discord Bot 核心
│   └── mcBot.js       # Minecraft Bot 核心
├── services/          # 業務邏輯層（Service Layer）
│   ├── *Service.js    # 各種業務邏輯服務
│   └── errorHandler.js # 統一錯誤處理器
├── repositories/      # 資料存取層（Repository Layer）
│   └── *Repository.js # 資料庫 CRUD 操作
├── utils/             # 工具層（Utility Layer）
│   ├── logger.js      # 日誌工具
│   ├── format.js      # 格式化工具
│   └── minecraft.js   # Minecraft 相關工具
├── data/              # 資料儲存目錄
├── scripts/           # 腳本與工具
└── config.toml        # 配置檔案
```

### 層級職責劃分

| 層級 | 職責 | 可呼叫層級 | 禁止事項 |
|------|------|-----------|----------|
| **Command** | 處理使用者輸入、參數驗證、權限檢查 | Service, Utils | 直接操作資料庫、複雜業務邏輯 |
| **Service** | 業務邏輯處理、流程編排、狀態管理 | Repository, Utils, 其他 Service | 直接操作資料庫底層 API |
| **Repository** | 資料庫 CRUD、查詢封裝、資料驗證 | Utils (僅限格式化) | 業務邏輯判斷 |
| **Utils** | 純函數工具、格式化、驗證 | 無（獨立） | 依賴其他層級 |

**依賴規則**: Command → Service → Repository → Utils（單向依賴）

---

## 💻 程式碼風格

### 基本規範

1. **縮排**: 使用 **4 個空格**（不使用 Tab）
2. **分號**: 每行語句結尾**必須**加分號 `;`
3. **引號**: 優先使用**單引號** `'`，字串模板使用反引號 `` ` ``
4. **檔案編碼**: UTF-8
5. **換行符**: LF（`\n`）

### 語法規範

```javascript
// ✅ 正確：使用 const/let，不使用 var
const config = require('./config');
let counter = 0;

// ✅ 正確：物件和陣列結尾加逗號（便於版本控制）
const options = {
    timeout: 5000,
    retries: 3,
};

// ✅ 正確：解構賦值簡化程式碼
const { playerId, amount } = betTask;

// ✅ 正確：async/await 處理非同步
async function execute(bot, playerId, args) {
    const user = await userRepository.getUserByUUID(uuid);
    // ...
}

// ❌ 錯誤：使用 var
var name = 'test';

// ❌ 錯誤：混用 Promise 和 callback
getUserData(uuid, (err, data) => {
    // ...
});
```

### 註解規範

```javascript
/**
 * JSDoc 格式文檔註解（用於函數/類別）
 * @param {string} playerId - 玩家 ID
 * @param {number} amount - 金額
 * @returns {Promise<Object>} 交易結果
 * @throws {Error} 當餘額不足時拋出錯誤
 */
async function processPayment(playerId, amount) {
    // 單行註解：說明複雜邏輯的意圖
    const balance = await getBalance(playerId);
    
    /* 多行註解：解釋複雜演算法
       計算公式：賠率 = 基礎賠率 + 等級加成
       避免浮點數精度問題 */
    const odds = Math.floor((1.85 * 10000 + bonusOdds * 10000) / 10000);
    
    // TODO: 實作退款機制
    // FIXME: 修復超時問題
}
```

**註解原則**:
- **寫「為什麼」而非「是什麼」**: 解釋決策原因，不要重複描述程式碼
- **TODO/FIXME 標記**: 標註待辦事項和已知問題
- **保持更新**: 程式碼修改時同步更新註解

---

## 🏷️ 命名規範

### 檔案命名

| 類型 | 規則 | 範例 |
|------|------|------|
| Service | `xxxService.js` | `betService.js`, `paymentService.js` |
| Repository | `XxxRepository.js` | `UserRepository.js`, `BetRepository.js` |
| Command | `動詞或名詞.js` | `daily.js`, `deposit.js`, `help.js` |
| Utils | `名詞.js` | `logger.js`, `format.js` |

### 變數與函數命名

```javascript
// ✅ 正確：駝峰式命名（camelCase）
const playerId = 'Jimmy4Real';
const emeraldAmount = 1000;

function getUserBalance(uuid) { }
async function processPayment(playerId, amount) { }

// ✅ 正確：常數使用全大寫 + 底線
const MAX_BET_AMOUNT = 1000000;
const DEFAULT_TIMEOUT = 5000;
const BET_TYPE_NORMAL = 'normal';

// ✅ 正確：類別使用大駝峰命名（PascalCase）
class BetService { }
class UserRepository { }

// ✅ 正確：布林值使用 is/has/can 前綴
const isBlacklisted = true;
const hasPermission = false;
const canBet = true;

// ✅ 正確：私有方法使用 _ 前綴
class BetService {
    async processTask(task) { }        // 公開
    async _clickRedstoneDust() { }     // 私有
    async _logBetResult() { }          // 私有
}

// ❌ 錯誤：使用拼音或無意義命名
const yonghu = 'test';
const a = 100;
const tmp = null;
```

### 語義化命名

```javascript
// ✅ 正確：清楚表達意圖
async function validatePlayerBalance(playerId, requiredAmount) { }
async function refundFailedBet(playerId, amount) { }
const isBalanceSufficient = balance >= requiredAmount;

// ❌ 錯誤：模糊不清
async function check(id, amt) { }
async function doRefund(p, a) { }
const flag = balance >= requiredAmount;
```

---

## ⚠️ 錯誤處理

### 錯誤分類體系

| 錯誤類型 | 錯誤代碼前綴 | 處理方式 | 範例 |
|---------|------------|---------|------|
| **付款錯誤** | `PAYMENT_` | 記錄 + 退款 + 通知 | `PAYMENT_TIMEOUT` |
| **下注錯誤** | `BET_` | 記錄 + 退款/錢包 | `BET_INSUFFICIENT_BALANCE` |
| **系統錯誤** | `SYSTEM_` | 記錄 + 告警 | `SYSTEM_DATABASE_ERROR` |
| **Discord 錯誤** | `DISCORD_` | 記錄 + 通知 | `DISCORD_API_ERROR` |
| **驗證錯誤** | `VALIDATION_` | 回傳錯誤訊息 | `VALIDATION_INVALID_AMOUNT` |

### 標準錯誤代碼

```javascript
// 定義在 constants/errorCodes.js
const ERROR_CODES = {
    // 付款相關
    PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
    PAYMENT_INSUFFICIENT_BALANCE: 'PAYMENT_INSUFFICIENT_BALANCE',
    PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
    
    // 下注相關
    BET_REDSTONE_NOT_FOUND: 'REDSTONE_NOT_FOUND',
    BET_REDSTONE_TIMEOUT: 'REDSTONE_TIMEOUT',
    BET_NO_PERMISSION: 'NO_PERMISSION',
    BET_INVALID_AMOUNT: 'INVALID_AMOUNT',
    BET_INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    
    // 使用者相關
    USER_UUID_NOT_FOUND: 'UUID_NOT_FOUND',
    USER_BLACKLISTED: 'USER_BLACKLISTED',
    USER_NOT_ACCEPTED_EULA: 'NO_ACCEPT_EULA',
    
    // 系統相關
    SYSTEM_DATABASE_ERROR: 'DATABASE_ERROR',
    SYSTEM_NETWORK_ERROR: 'NETWORK_ERROR',
};
```

### 錯誤處理標準流程

```javascript
// ✅ 正確：完整的錯誤處理流程
async function execute(bot, playerId, args) {
    try {
        // 1. 參數驗證
        if (!args[0]) {
            bot.chat(`/m ${playerId} &c請輸入金額`);
            return;
        }
        
        const amount = removeCommas(args[0]);
        if (isNaN(amount) || amount <= 0) {
            bot.chat(`/m ${playerId} &c金額格式錯誤`);
            return;
        }
        
        // 2. 業務邏輯
        const playerUUID = await userInfoService.getMinecraftUUID(playerId);
        const result = await paymentService.processPayment(playerId, amount);
        
        // 3. 成功回應
        Logger.info(`[CommandName] ${playerId} 操作成功`);
        bot.chat(`/m ${playerId} &a操作成功`);
        
    } catch (error) {
        // 4. 錯誤處理
        Logger.error(`[CommandName] ${playerId} 操作失敗:`, error);
        
        // 5. 根據錯誤類型決定處理方式
        if (error.message === 'UUID_NOT_FOUND') {
            bot.chat(`/m ${playerId} &c無法取得您的 UUID，請稍後再試`);
        } else if (error.message === 'INSUFFICIENT_BALANCE') {
            bot.chat(`/m ${playerId} &c餘額不足`);
            // 退款邏輯
        } else {
            // 記錄未預期錯誤
            const errorID = await errorHandler.handlePaymentError(
                bot, 
                playerId, 
                error, 
                { amount, currency: 'emerald' }
            );
            bot.chat(`/m ${playerId} &c操作失敗 &7(錯誤ID: ${errorID})`);
        }
    }
}
```

### Service 層錯誤處理

```javascript
class PaymentService {
    /**
     * 處理付款
     * @throws {Error} 拋出具體錯誤訊息
     */
    async processPayment(playerId, amount) {
        try {
            // 驗證參數
            if (!playerId || !amount) {
                throw new Error('VALIDATION_INVALID_PARAMS');
            }
            
            // 檢查餘額
            const balance = await this.getBalance(playerId);
            if (balance < amount) {
                throw new Error('INSUFFICIENT_BALANCE');
            }
            
            // 執行付款
            const result = await this._executePayment(playerId, amount);
            
            return {
                success: true,
                transactionId: result.id,
                balance: result.newBalance,
            };
            
        } catch (error) {
            // 記錄錯誤（但不處理，由上層決定）
            Logger.error(`[PaymentService.processPayment] ${playerId} 付款失敗:`, error);
            
            // 重新拋出，讓呼叫者處理
            throw error;
        }
    }
    
    /**
     * 私有方法：執行付款邏輯
     * @private
     */
    async _executePayment(playerId, amount) {
        // 實作細節...
    }
}
```

### 錯誤記錄規範

```javascript
// ✅ 正確：詳細記錄錯誤上下文
Logger.error(`[BetService.processTask] ${playerId} 下注失敗:`, error, {
    betType: 'normal',
    amount: 1000,
    playerUUID: 'xxx-xxx-xxx',
    timestamp: new Date().toISOString(),
});

// ✅ 正確：使用 errorHandler 統一處理
const errorResult = await errorHandler.handleBetError(
    bot, 
    playerId, 
    'REDSTONE_TIMEOUT',
    '下注失敗: 偵測結果超時', 
    {
        betType: 'normal',
        amount: 1000,
        currency: 'emerald',
    }
);

// ❌ 錯誤：吞掉錯誤不處理
try {
    await doSomething();
} catch (error) {
    // 什麼都不做
}

// ❌ 錯誤：不記錄錯誤上下文
Logger.error('錯誤');
```

### 退款處理標準

```javascript
/**
 * 標準退款流程
 */
async function handleRefund({ 
    bot, 
    playerId, 
    amount, 
    currency, 
    errorType, 
    errorMsg,
    refundReason 
}) {
    let errorID = '';
    
    // 1. 記錄錯誤
    const result = await errorHandler.handleBetError(
        bot, 
        playerId, 
        errorType, 
        errorMsg, 
        {
            amount,
            currency,
            reason: refundReason,
        }
    );
    
    if (result.result === 'success') {
        errorID = `(ID: &c${result.errorID}&f)`;
    }
    
    // 2. 執行退款
    try {
        await paymentService[currency === 'emerald' ? 'epay' : 'cpay'](
            playerId, 
            amount
        );
        bot.chat(`/m ${playerId} &f已退回給您 &b${addCommas(amount)} &f個${currency === 'emerald' ? '&a綠寶石' : '&6村民錠'} ${errorID}`);
    } catch (error) {
        // 3. 退款失敗，加到錢包
        await errorHandler.handlePaymentError(bot, playerId, error, {
            type: currency === 'emerald' ? 'epay' : 'cpay',
            amount,
            currency,
            reason: 'refund_failed',
        });
        bot.chat(`/m ${playerId} &c退款失敗，已將金額加到您的錢包 ${errorID}`);
    }
}
```

---

## 🔧 服務層規範

### Service 類別結構範本

```javascript
const Logger = require('../utils/logger');
const client = require('../core/client');
const { xxxRepository } = require('../repositories');

/**
 * XxxService 類別
 * 職責：描述此 Service 的核心功能
 */
class XxxService {
    constructor() {
        // 初始化屬性
        this.repository = xxxRepository;
        this.cache = new Map();
    }
    
    // === 公開方法 ===
    
    /**
     * 公開方法：說明此方法的用途
     * @param {string} param1 - 參數說明
     * @returns {Promise<Object>} 回傳值說明
     */
    async publicMethod(param1) {
        try {
            Logger.info(`[XxxService.publicMethod] 開始處理: ${param1}`);
            
            // 1. 驗證輸入
            this._validateInput(param1);
            
            // 2. 業務邏輯
            const result = await this._processLogic(param1);
            
            // 3. 回傳結果
            return {
                success: true,
                data: result,
            };
            
        } catch (error) {
            Logger.error(`[XxxService.publicMethod] 處理失敗:`, error);
            throw error;
        }
    }
    
    // === 私有方法 ===
    
    /**
     * 私有方法：驗證輸入
     * @private
     */
    _validateInput(param1) {
        if (!param1) {
            throw new Error('VALIDATION_INVALID_PARAMS');
        }
    }
    
    /**
     * 私有方法：處理業務邏輯
     * @private
     */
    async _processLogic(param1) {
        // 實作細節
        return {};
    }
}

// === 單例模式匯出 ===
const xxxService = new XxxService();

// === 事件監聽器 ===
client.on('someEvent', async (data) => {
    Logger.info(`[XxxService] 收到事件: ${JSON.stringify(data)}`);
    // 處理事件
});

module.exports = xxxService;
```

### Service 層最佳實踐

1. **單一職責**: 每個 Service 只負責一個業務領域
2. **無狀態設計**: 避免在 Service 中儲存請求相關狀態
3. **依賴注入**: 透過建構子注入依賴（Repository、其他 Service）
4. **錯誤向上傳遞**: Service 不處理錯誤，由呼叫者決定
5. **返回標準格式**: 統一回傳 `{ success, data, message }` 格式

```javascript
// ✅ 正確：標準回傳格式
return {
    success: true,
    data: { userId: '123', balance: 1000 },
    message: '操作成功',
};

// ✅ 正確：錯誤情況
return {
    success: false,
    error: 'INSUFFICIENT_BALANCE',
    message: '餘額不足',
};
```

---

## 🎮 指令開發規範

### 指令檔案結構範本

```javascript
const Logger = require("../../utils/logger");
const { addCommas, removeCommas } = require("../../utils/format");
const xxxService = require("../../services/xxxService");

/**
 * 指令模組匯出格式
 */
module.exports = {
    // 指令名稱（小寫）
    name: 'commandname',
    
    // 指令別名（陣列）
    aliases: ['alias1', '別名1'],
    
    // 指令說明（簡短清楚）
    description: '這個指令的功能說明',
    
    // 使用範例
    usage: '/m bot commandname [參數1] [參數2]',
    
    // 所需權限等級 (0=所有人, 1=VIP, 2=管理員)
    requiredPermissionLevel: 0,
    
    // 執行函數
    execute,
};

/**
 * 指令執行函數
 * @param {Object} bot - Minecraft bot 實例
 * @param {string} playerId - 玩家 ID
 * @param {Array<string>} args - 指令參數陣列
 */
async function execute(bot, playerId, args) {
    try {
        // === 1. 參數驗證 ===
        if (args.length < 1) {
            bot.chat(`/m ${playerId} &c用法: ${module.exports.usage}`);
            return;
        }
        
        const param1 = args[0];
        if (!isValidParam(param1)) {
            bot.chat(`/m ${playerId} &c參數格式錯誤`);
            return;
        }
        
        // === 2. 權限檢查 ===
        const hasPermission = await checkPermission(playerId);
        if (!hasPermission) {
            bot.chat(`/m ${playerId} &c您沒有權限執行此指令`);
            return;
        }
        
        // === 3. 業務邏輯（呼叫 Service）===
        Logger.info(`[CommandName] ${playerId} 執行指令: ${args.join(' ')}`);
        const result = await xxxService.doSomething(playerId, param1);
        
        // === 4. 結果回應 ===
        if (result.success) {
            bot.chat(`/m ${playerId} &a操作成功！`);
        } else {
            bot.chat(`/m ${playerId} &c${result.message}`);
        }
        
    } catch (error) {
        // === 5. 錯誤處理 ===
        Logger.error(`[CommandName] ${playerId} 執行失敗:`, error);
        bot.chat(`/m ${playerId} &c執行指令時發生錯誤，請稍後再試`);
    }
}

/**
 * 輔助函數：參數驗證
 */
function isValidParam(param) {
    // 驗證邏輯
    return true;
}

/**
 * 輔助函數：權限檢查
 */
async function checkPermission(playerId) {
    // 權限檢查邏輯
    return true;
}
```

### 指令參數處理

```javascript
// ✅ 正確：處理可選參數
const amount = args[0] ? removeCommas(args[0]) : 0;
const type = args[1] || 'default';

// ✅ 正確：參數數量檢查
if (args.length < 2) {
    bot.chat(`/m ${playerId} &c參數不足，用法: /m bot command <param1> <param2>`);
    return;
}

// ✅ 正確：參數格式驗證
const amount = removeCommas(args[0]);
if (isNaN(amount) || amount <= 0) {
    bot.chat(`/m ${playerId} &c金額必須是正整數`);
    return;
}

// ✅ 正確：處理剩餘參數
const reason = args.slice(1).join(' '); // 將所有後續參數合併
```

### 指令回應訊息規範

```javascript
// ✅ 正確：使用 Minecraft 顏色代碼
bot.chat(`/m ${playerId} &a成功`);           // 綠色 = 成功
bot.chat(`/m ${playerId} &c錯誤`);           // 紅色 = 錯誤
bot.chat(`/m ${playerId} &e警告`);           // 黃色 = 警告
bot.chat(`/m ${playerId} &b數值: ${value}`); // 藍綠 = 數值
bot.chat(`/m ${playerId} &7備註資訊`);       // 灰色 = 次要資訊

// ✅ 正確：使用格式化工具
bot.chat(`/m ${playerId} 金額: &b${addCommas(amount)} &a綠寶石`);

// ✅ 正確：多行訊息
bot.chat(`/m ${playerId} &e=== 帳戶資訊 ===`);
bot.chat(`/m ${playerId} 綠寶石: &b${addCommas(emerald)}`);
bot.chat(`/m ${playerId} 村民錠: &6${addCommas(coin)}`);
```

---

## 💾 資料庫操作

### Repository 類別結構範本

```javascript
const Logger = require('../utils/logger');
const { openDB } = require('./index');

/**
 * XxxRepository 類別
 * 職責：處理 Xxx 相關的資料庫操作
 */
class XxxRepository {
    constructor() {
        this.dbName = 'xxxDB';
    }
    
    /**
     * 創建記錄
     * @param {Object} data - 要創建的資料
     * @returns {Promise<Object>} 創建結果
     */
    async create(data) {
        try {
            const db = openDB(this.dbName);
            const id = this._generateId();
            
            await db.put(id, {
                ...data,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            
            Logger.info(`[XxxRepository.create] 創建成功: ${id}`);
            return { success: true, id };
            
        } catch (error) {
            Logger.error(`[XxxRepository.create] 創建失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 查詢單筆記錄
     * @param {string} id - 記錄 ID
     * @returns {Promise<Object|null>} 查詢結果
     */
    async findById(id) {
        try {
            const db = openDB(this.dbName);
            const record = await db.get(id);
            return record || null;
        } catch (error) {
            Logger.error(`[XxxRepository.findById] 查詢失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 查詢所有記錄
     * @returns {Promise<Array>} 所有記錄
     */
    async findAll() {
        try {
            const db = openDB(this.dbName);
            const records = [];
            
            for await (const { key, value } of db.getRange()) {
                records.push({ id: key, ...value });
            }
            
            return records;
        } catch (error) {
            Logger.error(`[XxxRepository.findAll] 查詢失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 更新記錄
     * @param {string} id - 記錄 ID
     * @param {Object} data - 要更新的資料
     * @returns {Promise<Object>} 更新結果
     */
    async update(id, data) {
        try {
            const db = openDB(this.dbName);
            const existing = await db.get(id);
            
            if (!existing) {
                throw new Error('RECORD_NOT_FOUND');
            }
            
            await db.put(id, {
                ...existing,
                ...data,
                updatedAt: Date.now(),
            });
            
            Logger.info(`[XxxRepository.update] 更新成功: ${id}`);
            return { success: true };
            
        } catch (error) {
            Logger.error(`[XxxRepository.update] 更新失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 刪除記錄
     * @param {string} id - 記錄 ID
     * @returns {Promise<Object>} 刪除結果
     */
    async delete(id) {
        try {
            const db = openDB(this.dbName);
            await db.remove(id);
            
            Logger.info(`[XxxRepository.delete] 刪除成功: ${id}`);
            return { success: true };
            
        } catch (error) {
            Logger.error(`[XxxRepository.delete] 刪除失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 私有方法：生成 ID
     * @private
     */
    _generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${this.dbName.toUpperCase()}_${timestamp}_${random}`;
    }
}

module.exports = new XxxRepository();
```

### 資料庫操作最佳實踐

1. **統一錯誤處理**: 所有資料庫操作都要 try-catch
2. **時間戳記**: 創建/更新記錄時自動加上 `createdAt` / `updatedAt`
3. **ID 生成規範**: `PREFIX_timestamp_random` 格式
4. **查詢結果驗證**: 檢查查詢結果是否存在
5. **批次操作**: 使用 LMDB 的事務功能

```javascript
// ✅ 正確：使用事務批次更新
async batchUpdate(updates) {
    const db = openDB(this.dbName);
    await db.transaction(() => {
        for (const { id, data } of updates) {
            db.put(id, data);
        }
    });
}
```

---

## 📝 日誌規範

### 日誌等級使用時機

| 等級 | 使用時機 | 範例 |
|------|---------|------|
| **info** | 正常業務流程、重要狀態變更 | 玩家下注、領取獎勵、系統啟動 |
| **warn** | 異常但可恢復的情況 | 參數格式錯誤、餘額不足 |
| **error** | 錯誤需要追蹤 | 資料庫錯誤、API 呼叫失敗、未預期異常 |
| **debug** | 開發除錯資訊 | 變數狀態、執行流程細節 |

### 日誌訊息格式規範

```javascript
// ✅ 正確：[模組.方法] 操作主體 動作描述: 詳細資訊
Logger.info(`[BetService.processTask] ${playerId} 下注成功: 金額=${amount}, 結果=${result}`);
Logger.error(`[PaymentService.epay] ${playerId} 付款失敗:`, error);
Logger.warn(`[CommandHandler] ${playerId} 權限不足: 需要等級=${requiredLevel}`);

// ✅ 正確：結構化日誌（便於查詢）
Logger.info(`[BetService.addTask] 新增任務`, {
    playerId,
    amount,
    betType: 'normal',
    timestamp: Date.now(),
});

// ❌ 錯誤：訊息不清楚
Logger.info(`處理完成`);
Logger.error(`錯誤`);
```

### 敏感資訊處理

```javascript
// ✅ 正確：遮蔽敏感資訊
Logger.info(`[AuthService] 玩家登入: UUID=${uuid.substring(0, 8)}***`);

// ❌ 錯誤：記錄完整敏感資訊
Logger.info(`[AuthService] Token: ${fullToken}`);
```

---

## 🧪 測試規範

### 測試檔案結構

```
tests/
├── unit/              # 單元測試
│   ├── services/      # Service 層測試
│   ├── repositories/  # Repository 層測試
│   └── utils/         # Utils 測試
├── integration/       # 整合測試
└── fixtures/          # 測試資料
```

### 單元測試範本

```javascript
const { describe, test, expect, beforeEach } = require('bun:test');
const XxxService = require('../services/xxxService');

describe('XxxService', () => {
    let service;
    
    beforeEach(() => {
        service = new XxxService();
    });
    
    describe('publicMethod', () => {
        test('應該在正常情況下返回成功', async () => {
            const result = await service.publicMethod('validInput');
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
        
        test('應該在無效輸入時拋出錯誤', async () => {
            expect(async () => {
                await service.publicMethod(null);
            }).toThrow('VALIDATION_INVALID_PARAMS');
        });
    });
});
```

### 測試覆蓋率目標

- **Service 層**: 80% 以上
- **Repository 層**: 70% 以上
- **Utils 層**: 90% 以上

---

## 🔒 安全規範

### 輸入驗證

```javascript
// ✅ 正確：驗證所有使用者輸入
function validateAmount(input) {
    const amount = removeCommas(input);
    
    if (isNaN(amount)) {
        throw new Error('VALIDATION_NOT_A_NUMBER');
    }
    
    if (amount <= 0) {
        throw new Error('VALIDATION_AMOUNT_TOO_SMALL');
    }
    
    if (amount > MAX_BET_AMOUNT) {
        throw new Error('VALIDATION_AMOUNT_TOO_LARGE');
    }
    
    return amount;
}
```

### SQL/NoSQL 注入防護

```javascript
// ✅ 正確：使用參數化查詢（即使是 LMDB 也要驗證）
async findByPlayerId(playerId) {
    // 驗證輸入格式
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(playerId)) {
        throw new Error('VALIDATION_INVALID_PLAYER_ID');
    }
    
    const db = openDB(this.dbName);
    return await db.get(playerId);
}
```

### 權限控制

```javascript
// ✅ 正確：每個需要權限的操作都要檢查
async function execute(bot, playerId, args) {
    const playerRank = await rankService.getPlayerRank(playerId);
    
    if (playerRank.level < module.exports.requiredPermissionLevel) {
        bot.chat(`/m ${playerId} &c您沒有權限執行此指令`);
        return;
    }
    
    // 繼續執行...
}
```

### 黑名單檢查

```javascript
// ✅ 正確：在處理使用者操作前檢查黑名單
const blacklistInfo = await blacklistService.isBlacklisted(playerId);

if (blacklistInfo.result) {
    Logger.warn(`[Security] 封鎖玩家嘗試操作: ${playerId}`);
    bot.chat(`/m ${playerId} &c您已被封鎖使用本機器人`);
    return;
}
```

---

## ⚡ 效能考量

### 快取策略

```javascript
class CacheableService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 分鐘
    }
    
    async getData(key) {
        // 檢查快取
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            Logger.debug(`[CacheableService] 快取命中: ${key}`);
            return cached.data;
        }
        
        // 快取未命中，從資料庫載入
        const data = await this.repository.findById(key);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
        
        return data;
    }
    
    invalidateCache(key) {
        this.cache.delete(key);
    }
}
```

### 非同步處理

```javascript
// ✅ 正確：平行處理獨立任務
const [user, rank, balance] = await Promise.all([
    userRepository.getUserByUUID(uuid),
    rankService.getUserRank(uuid),
    paymentService.getBalance(playerId),
]);

// ❌ 錯誤：序列執行獨立任務
const user = await userRepository.getUserByUUID(uuid);
const rank = await rankService.getUserRank(uuid);
const balance = await paymentService.getBalance(playerId);
```

### 任務佇列

```javascript
// ✅ 正確：使用佇列處理耗時任務（已實作於 BetService）
class TaskQueueService {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    addTask(task) {
        this.queue.push(task);
    }
    
    async processQueue() {
        if (this.processing) return;
        
        this.processing = true;
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            await this.processTask(task);
        }
        this.processing = false;
    }
}
```

### 資料庫查詢優化

```javascript
// ✅ 正確：使用索引範圍查詢
async findByDateRange(startDate, endDate) {
    const db = openDB(this.dbName);
    const results = [];
    
    for await (const { key, value } of db.getRange({
        start: `DATE_${startDate}`,
        end: `DATE_${endDate}`,
    })) {
        results.push(value);
    }
    
    return results;
}

// ❌ 錯誤：全表掃描後過濾
async findByDateRange(startDate, endDate) {
    const all = await this.findAll();
    return all.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
}
```

---

## 📦 模組匯出規範

### Service/Repository 匯出

```javascript
// ✅ 正確：匯出單例實例
class XxxService {
    // ...
}

module.exports = new XxxService();
```

### Utils 匯出

```javascript
// ✅ 正確：匯出純函數
function addCommas(number) {
    // ...
}

function removeCommas(string) {
    // ...
}

module.exports = {
    addCommas,
    removeCommas,
};
```

### Command 匯出

```javascript
// ✅ 正確：匯出指令設定物件
module.exports = {
    name: 'commandname',
    aliases: ['alias'],
    description: '說明',
    usage: '用法',
    requiredPermissionLevel: 0,
    execute,
};
```

---

## 🔄 程式碼審查檢查清單

在提交程式碼前，請確認以下項目：

### 功能性
- [ ] 功能符合需求
- [ ] 邊界條件都有處理
- [ ] 錯誤情況都有測試

### 程式碼品質
- [ ] 遵循命名規範
- [ ] 沒有重複程式碼（DRY原則）
- [ ] 函數單一職責
- [ ] 註解清楚且必要

### 錯誤處理
- [ ] 所有 async 函數都有 try-catch
- [ ] 錯誤訊息清楚明確
- [ ] 使用標準錯誤代碼
- [ ] 錯誤都有記錄日誌

### 效能
- [ ] 避免不必要的資料庫查詢
- [ ] 獨立任務使用 Promise.all
- [ ] 大量資料有分頁處理

### 安全
- [ ] 使用者輸入都有驗證
- [ ] 敏感資訊不會記錄
- [ ] 權限檢查完整

### 測試
- [ ] 寫了單元測試
- [ ] 測試覆蓋主要路徑
- [ ] 手動測試通過

---

## 📚 參考資源

### 內部文件
- [README.md](./README.md) - 專案說明
- [dataformat.txt](./dataformat.txt) - 資料格式說明

### 外部資源
- [Mineflayer 文檔](https://github.com/PrismarineJS/mineflayer)
- [LMDB 文檔](https://github.com/kriszyp/lmdb-js)
- [Discord.js 指南](https://discordjs.guide/)

---

## 🔄 版本紀錄

| 版本 | 日期 | 修改內容 |
|------|------|----------|
| 1.0.0 | 2025-10-03 | 初始版本 |

---

## 📧 聯絡資訊

如對此規格文檔有任何疑問或建議，請聯絡開發團隊。

---

**⚠️ 重要提醒**: 本規格文檔是活文檔，隨專案發展會持續更新。所有開發者都應該定期檢視並遵循最新版本。
