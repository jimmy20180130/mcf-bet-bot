const Logger = require('../utils/logger');

class ServiceManager {
    constructor() {
        this.services = new Map(); // { name: { module, config } }
        this.mcBot = null;
        this.dcBot = null;
        this.isInitialized = false;
    }

    register({ name, path }) {
        if (!name || !path) throw new Error(`[ServiceManager.register] 註冊服務需包含服務名稱及路徑(名稱: ${name?name:'未知'}，路徑: ${path?path:'未知'})`);
        this.services.set(name, { config: { name, path }, module: null });
    }

    async initialize() {
        if (this.isInitialized) {
            Logger.warn('[ServiceManager] 服務已初始化，跳過');
            return;
        }
        for (const [name] of this.services) {
            try {
                await this._load(name);
            } catch (err) {
                Logger.error(`[ServiceManager] 初始化服務 ${name} 失敗:`, err);
            }
        }
        this.isInitialized = true;
        Logger.info('[ServiceManager] 所有服務初始化完成');
    }

    async cleanup() {
        if (!this.isInitialized) return;
        await this.unloadService('all');
        this.isInitialized = false;
        Logger.info('[ServiceManager] 所有服務清理完成');
    }

    async reloadService(serviceName = 'all') {
        const targets = serviceName === 'all' ? this.services.keys() : [serviceName];
        for (const name of targets) {
            if (!this.services.has(name)) throw new Error(`Service ${name} not registered`);
            try {
                const service = this.services.get(name);
                if (service.module?.reload) {
                    await service.module.reload(this.mcBot, this.dcBot);
                } else {
                    await this._unload(name);
                    await this._load(name);
                }
                Logger.debug(`[ServiceManager] 服務 ${name} 重新載入完成`);
            } catch (err) {
                Logger.error(`[ServiceManager] 重新載入服務 ${name} 失敗:`, err);
            }
        }
        if (serviceName === 'all') Logger.info('[ServiceManager] 所有服務重新載入完成');
    }

    async unloadService(serviceName = 'all') {
        const targets =
            serviceName === 'all'
                ? Array.from(this.services.keys()).reverse()
                : [serviceName];
        for (const name of targets) {
            if (!this.services.has(name)) throw new Error(`Service ${name} not registered`);
            try {
                await this._unload(name);
            } catch (err) {
                Logger.error(`[ServiceManager] 停用服務 ${name} 失敗:`, err);
            }
        }
        if (serviceName === 'all') Logger.info('[ServiceManager] 所有服務停用完成');
    }

    getServiceNames() {
        return Array.from(this.services.keys());
    }

    getServiceStatus(serviceName) {
        const s = this.services.get(serviceName);
        if (!s) return null;
        return {
            name: serviceName,
            loaded: s.module !== null,
            version: s.module?.version || 'unknown'
        };
    }

    async _load(name) {
        const s = this.services.get(name);
        if (!s) return;
        if (s.module) await this._unload(name);

        const mod = require(s.config.path);
        if (!mod?.name) throw new Error(`Service ${name} 缺少 name 或 init`);
        
        if (typeof mod.init === 'function') await mod.init();
        s.module = mod;
        Logger.debug(`[ServiceManager] 服務 ${name} 載入完成`);
    }

    async _unload(name) {
        const s = this.services.get(name);
        if (!s?.module) return;

        if (typeof s.module.cleanup === 'function') await s.module.cleanup();
        const modulePath = require.resolve(s.config.path);
        delete require.cache[modulePath];
        s.module = null;
        Logger.debug(`[ServiceManager] 服務 ${name} 停用完成`);
    }
}

module.exports = new ServiceManager();
