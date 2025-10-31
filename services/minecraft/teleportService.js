const { client } = require('../../core/client');
const Logger = require('../../utils/logger');
const userRepository = require('../../repositories').userRepository;

class TeleportService {
    constructor() {
        this.bot = null;
        this.eventHandlers = [];
    }

    init() {
        const spawnedHandler = (bot) => {
            this.setBot(bot);
        };
        client.on('mcSpawned', spawnedHandler);
        this.eventHandlers.push({ event: 'mcSpawned', listener: spawnedHandler });

        const tpRequestHandler = async ({ bot, playerId }) => {
            await this.handleTpRequest(playerId);
        };
        client.on('tpRequest', tpRequestHandler);
        this.eventHandlers.push({ event: 'tpRequest', listener: tpRequestHandler });
    }

    cleanup() {
        Logger.debug('[TeleportService.cleanup] 清理 TeleportService');
        this.bot = null;
        
        // 移除所有事件監聽器
        for (const handler of this.eventHandlers) {
            client.removeListener(handler.event, handler.listener);
        }
        this.eventHandlers = [];
    }

    setBot(bot) {
        this.bot = bot;
    }

    async handleTpRequest(playerName) {
        if (!this.bot) return;
        const user = await userRepository.getUserByPlayerID(playerName);
        if (!user) {
            this._denyTpRequest(playerName);
            return;
        }

        Logger.info(`[TeleportService.handleTpRequest] 處理 ${playerName} 的傳送請求，permissionLevel: ${user.additionalInfo.permissionLevel}`);

        // TODO: 讓使用者可更改權限等級
        if (user.additionalInfo.permissionLevel >= 1 || playerName === 'Jimmy4Real') {
            this._acceptTpRequest(playerName);
        } else {
            this._denyTpRequest(playerName);
        }
    }

    _denyTpRequest(playerName) {
        if (!this.bot) return;
        Logger.info(`[TeleportService.handleTpRequest._denyTpRequest] 拒絕 ${playerName} 的傳送請求`);
        this.bot.chat(`/tno`); // 不用加上玩家名稱，沒屁用，拒絕的順序為最後請求的第一個拒絕
    }

    _acceptTpRequest(playerName) {
        if (!this.bot) return;
        Logger.info(`[TeleportService.handleTpRequest._acceptTpRequest] 接受 ${playerName} 的傳送請求`);
        this.bot.chat(`/tok`);
    }
}

const teleportService = new TeleportService();
teleportService.name = 'teleportService';

module.exports = teleportService;