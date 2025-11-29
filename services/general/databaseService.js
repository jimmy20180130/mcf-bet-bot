const { open } = require('lmdb');
const path = require('path');
const Logger = require('../../utils/logger');

// TODO: 清理不必要的垃圾
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', '..', 'data');
    }

    async init(mcBot, dcBot) {
        try {
            this.db = await open({
                path: this.dbPath,
                compression: true,
                encoding: 'msgpack',
            });
            
            Logger.info('[DatabaseService.init] 資料庫初始化成功');
            Logger.debug(`[DatabaseService.init] 資料庫路徑: ${this.dbPath}`);
        } catch (error) {
            Logger.error('[DatabaseService.init] 資料庫初始化失敗:', error);
            throw error;
        }
    }

    async put(key, value) {
        try {
            if (!this.db) {
                throw new Error('[DatabaseService.put] 資料庫尚未初始化');
            }

            await this.db.put(key, value);
            Logger.debug(`[DatabaseService.put] 成功寫入資料: ${key}`);
            return true;
        } catch (error) {
            Logger.error(`[DatabaseService.put] 寫入資料失敗 (${key}):`, error);
            return false;
        }
    }

    async get(key) {
        try {
            if (!this.db) {
                throw new Error('[DatabaseService.get] 資料庫尚未初始化');
            }

            const value = await this.db.get(key);
            if (value !== undefined) {
                Logger.debug(`[DatabaseService.get] 成功讀取資料: ${key}`);
                return value;
            } else {
                Logger.debug(`[DatabaseService.get] 資料不存在: ${key}`);
                return null;
            }
        } catch (error) {
            Logger.error(`[DatabaseService.get] 讀取資料失敗 (${key}):`, error);
            return null;
        }
    }

    async remove(key) {
        try {
            if (!this.db) {
                throw new Error('[DatabaseService.remove] 資料庫尚未初始化');
            }

            const success = await this.db.remove(key);
            if (success) {
                Logger.debug(`[DatabaseService.remove] 成功刪除資料: ${key}`);
            } else {
                Logger.debug(`[DatabaseService.remove] 資料不存在，無法刪除: ${key}`);
            }
            return success;
        } catch (error) {
            Logger.error(`[DatabaseService.remove] 刪除資料失敗 (${key}):`, error);
            return false;
        }
    }

    async exists(key) {
        try {
            if (!this.db) {
                throw new Error('[DatabaseService.exists] 資料庫尚未初始化');
            }

            const value = await this.db.get(key);
            return value !== undefined;
        } catch (error) {
            Logger.error(`[DatabaseService.exists] 檢查資料存在性失敗 (${key}):`, error);
            return false;
        }
    }

    // TODO: 檢查是否需要此方法
    async putBatch(entries) {
        try {
            if (!this.db) {
                throw new Error('[DatabaseService.putBatch] 資料庫尚未初始化');
            }

            // 使用交易批量寫入
            await this.db.transaction(() => {
                for (const [key, value] of Object.entries(entries)) {
                    this.db.put(key, value);
                }
            });
            
            Logger.debug(`[DatabaseService.putBatch] 成功批量寫入 ${Object.keys(entries).length} 筆資料`);
            return true;
        } catch (error) {
            Logger.error('[DatabaseService.putBatch] 批量寫入資料失敗:', error);
            return false;
        }
    }

    // TODO: 檢查是否需要此方法
    async getKeys(prefix = '') {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            const keys = [];
            for (const { key } of this.db.getRange({ start: prefix })) {
                if (!prefix || key.startsWith(prefix)) {
                    keys.push(key);
                } else {
                    break; // LMDB 按字典序排列，一旦不匹配就可以停止
                }
            }
            
            Logger.debug(`[DatabaseService.getKeys] 找到 ${keys.length} 個符合前綴 '${prefix}' 的鍵值`);
            return keys;
        } catch (error) {
            Logger.error(`[DatabaseService.getKeys] 獲取鍵值列表失敗 (prefix: ${prefix}):`, error);
            return [];
        }
    }

    async getRange(prefix = '') {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            const result = {};
            for (const { key, value } of this.db.getRange({ start: prefix })) {
                if (!prefix || key.startsWith(prefix)) {
                    result[key] = value;
                } else {
                    break; // LMDB 按字典序排列，一旦不匹配就可以停止
                }
            }
            
            Logger.debug(`[DatabaseService.getRange] 獲取 ${Object.keys(result).length} 筆符合前綴 '${prefix}' 的資料`);
            return result;
        } catch (error) {
            Logger.error(`[DatabaseService.getRange] 獲取範圍資料失敗 (prefix: ${prefix}):`, error);
            return {};
        }
    }

    // TODO: 檢查是否需要此方法
    async clear() {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            await this.db.clearAsync();
            Logger.info('[DatabaseService.clear] 成功清空資料庫');
            return true;
        } catch (error) {
            Logger.error('[DatabaseService.clear] 清空資料庫失敗:', error);
            return false;
        }
    }

    async close() {
        try {
            if (this.db) {
                await this.db.close();
                this.db = null;
                Logger.info('[DatabaseService] 資料庫連接已關閉');
            }
        } catch (error) {
            Logger.error('[DatabaseService.close] 關閉資料庫連接失敗:', error);
        }
    }

    // TODO: 檢查是否需要此方法
    async getStats() {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            const stats = await this.db.getStats();
            Logger.debug('[DatabaseService.getStats] 獲取資料庫統計資訊');
            return stats;
        } catch (error) {
            Logger.error('[DatabaseService.getStats] 獲取資料庫統計資訊失敗:', error);
            return null;
        }
    }
    
    isInitialized() {
        return this.db !== null;
    }
}

// 創建單例實例
const databaseService = new DatabaseService();
databaseService.name = 'databaseService';

module.exports = databaseService;