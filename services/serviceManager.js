const Logger = require('../utils/logger');
const { cleanupMinecraftListeners } = require('../core/client');

/**
 * Minecraft 服務管理器 - 簡化版
 * 負責初始化和清理 Minecraft 相關服務
 */
class MinecraftServiceManager {
    constructor() {
        this.services = [];
        this.isInitialized = false;
    }

    /**
     * 註冊服務
     * @param {Object} service - 服務物件
     * @param {string} service.name - 服務名稱（用於日誌）
     * @param {string} service.path - 服務模組路徑
     */
    register(service) {
        this.services.push(service);
    }

    /**
     * 初始化所有服務
     */
    async initialize() {
        if (this.isInitialized) {
            Logger.warn('[ServiceManager] 服務已經初始化，跳過');
            return;
        }

        for (const service of this.services) {
            try {
                const module = require(service.path);
                if (module && typeof module.init === 'function') {
                    await module.init();
                }
                Logger.debug(`[ServiceManager] ${service.name} 初始化完成`);
            } catch (error) {
                Logger.error(`[ServiceManager] ${service.name} 初始化失敗:`, error);
            }
        }

        this.isInitialized = true;
        Logger.info('[ServiceManager] 所有服務初始化完成');
    }

    /**
     * 清理所有服務
     */
    async cleanup() {
        if (!this.isInitialized) {
            return;
        }

        // 清理所有事件監聽器
        cleanupMinecraftListeners();

        // 反向清理服務（後進先出）
        for (let i = this.services.length - 1; i >= 0; i--) {
            const service = this.services[i];
            try {
                const modulePath = require.resolve(service.path);
                const module = require.cache[modulePath]?.exports;

                if (module && typeof module.cleanup === 'function') {
                    await module.cleanup();
                }

                // 清除 require cache
                if (require.cache[modulePath]) {
                    delete require.cache[modulePath];
                }

                Logger.debug(`[ServiceManager] ${service.name} 清理完成`);
            } catch (error) {
                Logger.error(`[ServiceManager] ${service.name} 清理失敗:`, error);
            }
        }

        this.isInitialized = false;
        Logger.info('[ServiceManager] 所有服務清理完成');
    }

    /**
     * 重新初始化（清理後重新載入）
     */
    async reinitialize() {
        await this.cleanup();
        await this.initialize();
    }
}

// 創建全局單例
const serviceManager = new MinecraftServiceManager();

module.exports = serviceManager;
