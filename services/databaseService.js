const { open } = require('lmdb');
const path = require('path');
const Logger = require('../utils/logger');
// TODO: 清理不必要的垃圾
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'data');
        this.init();
    }

    /**
     * 初始化 LMDB 資料庫
     */
    init() {
        try {
            this.db = open({
                path: this.dbPath,
                compression: true, // 啟用壓縮以節省空間
                encoding: 'msgpack', // 使用 MessagePack 編碼，支援各種資料類型
            });
            
            Logger.info('[DatabaseService.init] LMDB 資料庫初始化成功');
            Logger.debug(`[DatabaseService.init] 資料庫路徑: ${this.dbPath}`);
        } catch (error) {
            Logger.error('[DatabaseService.init] LMDB 資料庫初始化失敗:', error);
            throw error;
        }
    }

    /**
     * 寫入資料到資料庫
     * @param {string} key - 資料的鍵值
     * @param {any} value - 要儲存的資料（可以是任何可序列化的資料類型）
     * @returns {Promise<boolean>} 是否寫入成功
     */
    async put(key, value) {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            await this.db.put(key, value);
            Logger.debug(`[DatabaseService.put] 成功寫入資料: ${key}`);
            return true;
        } catch (error) {
            Logger.error(`[DatabaseService.put] 寫入資料失敗 (${key}):`, error);
            return false;
        }
    }

    /**
     * 從資料庫讀取資料
     * @param {string} key - 資料的鍵值
     * @returns {Promise<any|null>} 讀取到的資料，如果不存在則回傳 null
     */
    async get(key) {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
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

    /**
     * 刪除資料庫中的資料
     * @param {string} key - 要刪除的資料鍵值
     * @returns {Promise<boolean>} 是否刪除成功
     */
    async remove(key) {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
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

    /**
     * 檢查資料是否存在
     * @param {string} key - 要檢查的資料鍵值
     * @returns {Promise<boolean>} 資料是否存在
     */
    async exists(key) {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
            }

            const value = await this.db.get(key);
            return value !== undefined;
        } catch (error) {
            Logger.error(`[DatabaseService.exists] 檢查資料存在性失敗 (${key}):`, error);
            return false;
        }
    }

    /**
     * 批量寫入資料
     * @param {Object} entries - 要寫入的資料物件，格式為 { key1: value1, key2: value2, ... }
     * @returns {Promise<boolean>} 是否寫入成功
     */
    async putBatch(entries) {
        try {
            if (!this.db) {
                throw new Error('資料庫尚未初始化');
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

    /**
     * 獲取所有符合前綴的鍵值
     * @param {string} prefix - 鍵值前綴
     * @returns {Promise<string[]>} 符合前綴的所有鍵值
     */
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

    /**
     * 獲取所有符合前綴的鍵值對
     * @param {string} prefix - 鍵值前綴
     * @returns {Promise<Object>} 符合前綴的所有鍵值對
     */
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

    /**
     * 清空資料庫
     * @returns {Promise<boolean>} 是否清空成功
     */
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

    /**
     * 關閉資料庫連接
     */
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

    /**
     * 獲取資料庫統計資訊
     * @returns {Promise<Object>} 資料庫統計資訊
     */
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

    /**
     * 檢查資料庫是否已初始化
     * @returns {boolean} 資料庫是否已初始化
     */
    isInitialized() {
        return this.db !== null;
    }
}

// 創建單例實例
const databaseService = new DatabaseService();

module.exports = databaseService;