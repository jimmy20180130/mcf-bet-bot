// TODO: implement local link method
const userRepository = require('../../repositories/index').userRepository;
const userInfoService = require('./userInfoService');
const Logger = require('../../utils/logger');

class LinkService {
    constructor() {
        this.verifyCode = []
        this.cleanupInterval = null;
    }

    async init() {
        Logger.debug('[LinkService.init] 初始化 LinkService');
        this.cleanupInterval = setInterval(() => this.removeCodes(), 60 * 1000);
    }

    async cleanup() {
        Logger.debug('[LinkService.cleanup] 清理 LinkService');
        clearInterval(this.cleanupInterval);
    }
    
    // 新增專屬於特定玩家的驗證碼
    addCode(playerID) {
        // 要先移除該玩家先前的驗證碼
        this.verifyCode = this.verifyCode.filter(entry => entry.playerID !== playerID);

        const code = this.generateCode();
        this.verifyCode.push({ playerID, code, timestamp: Date.now() });
        return code;
    }

    removeCodes() {
        const now = Date.now();
        // 超過五分鐘即清除
        this.verifyCode = this.verifyCode.filter(entry => now - entry.timestamp < 5 * 60 * 1000);
    }

    async validateCode(discordID, code) {
        try {
            const index = this.verifyCode.findIndex(entry => entry.code === code);
            const playerID = index !== -1 ? this.verifyCode[index].playerID : null;
            const playerUUID = playerID ? await userInfoService.getMinecraftUUID(playerID) : null;

            if (!playerUUID || !playerID) {
                return {
                    status: false,
                };
            }

            if (index !== -1) {
                this.verifyCode.splice(index, 1);

                await userRepository.updateUser(playerUUID, { discordID: discordID });

                return {
                    status: true,
                    playerID: playerID,
                    playerUUID: playerUUID,
                    discordID: discordID
                }
            } else {
                return {
                    status: false,
                };
            }
        } catch (error) {
            throw error;
        }
    }

    generateCode() {
        // 隨機長度為五的數字
        return Math.floor(10000 + Math.random() * 90000);
    }
}

const linkService = new LinkService();
linkService.name = 'linkService';

module.exports = linkService;