const userRepository = require('../../repositories/').userRepository;
const userinfoService = require('./userInfoService');
const Logger = require('../../utils/logger');
const { DatabaseError } = require('../../utils/errors');

// TODO: auto remove blacklist status if is expired
// blacklist and cooldown service
class BlacklistService {
    constructor() {
        this.blacklistCache = new Map(); // key: playerUUID
        this.cooldownCache = new Map(); // key: playerUUID, value: timestamp when last command executed
    }

    async init() {
        Logger.debug('[BlacklistService.init] 初始化 BlacklistService');
    }

    async cleanup() {
        Logger.debug('[BlacklistService.cleanup] 清理 BlacklistService');
        this.blacklistCache.clear();
        this.cooldownCache.clear();
    }

    async isBlacklisted(playerID) {
        const playerUUID = await userinfoService.getMinecraftUUID(playerID);
        let user = await userRepository.getUserByUUID(playerUUID)

        if (!user) {
            await userRepository.createUser({ playerUUID: playerUUID, playerID: playerID });
            user = await userRepository.getUserByUUID(playerUUID);
        }

        let userBlacklist = user.additionalInfo?.blacklist;
        let userAcceptEULA = user.additionalInfo?.acceptEULA;

        if (userBlacklist) {
            if (userAcceptEULA !== true) {
                // 如果沒接受 EULA 就直接封鎖
                userBlacklist.originalStatus = userBlacklist.status;
                userBlacklist.originalReason = userBlacklist.reason;
                userBlacklist.status = true;
                userBlacklist.reason = "NO_ACCEPT_EULA";
                userBlacklist.eula = false;
            }

            return {
                result: userBlacklist.status,
                reason: userBlacklist.reason,
                unbanTime: userBlacklist.unbanTime,
                notified: userBlacklist.notified,
                originalReason: userBlacklist.originalReason,
                originalStatus: userBlacklist.originalStatus,
                eula: userBlacklist.eula !== false,
            }
        } else {
            // 找不到 blacklist 資訊就拋出錯誤
            throw DatabaseError.notFound('blacklist 資訊', playerID);
        }
    }

    async isCooldown(playerID, cooldownDuration = 3000) {
        const now = Date.now();

        // 檢查是否在冷卻時間內
        if (this.cooldownCache.has(playerID)) {
            const lastCommandTime = this.cooldownCache.get(playerID);
            const timeSinceLastCommand = now - lastCommandTime;

            if (timeSinceLastCommand < cooldownDuration) {
                const remainingTime = cooldownDuration - timeSinceLastCommand;
                return {
                    result: true,
                };
            }
        }

        // 沒有冷卻或冷卻已結束，更新時間戳
        this.cooldownCache.set(playerID, now);

        return {
            result: false,
        };
    }

    async updateBlacklistInfo(playerID, { status = null, reason = null, unbanTime = null, notified = null, eula = null }) {
        // userInfoService 和 userRepository 現在會直接拋出錯誤，不需要在這裡處理
        const playerUUID = await userinfoService.getMinecraftUUID(playerID);
        const userBlacklist = await this.isBlacklisted(playerID)

        await userRepository.updateUser(playerUUID, {
            additionalInfo: {
                blacklist: {
                    status: status != null ? status : userBlacklist.originalStatus,
                    reason: reason != null ? reason : userBlacklist.originalReason,
                    unbanTime: unbanTime != null ? unbanTime : userBlacklist.unbanTime,
                    notified: notified != null ? notified : userBlacklist.notified
                },
                acceptEULA: eula != null ? eula : userBlacklist.eula
            }
        });
    }
}

const blacklistService = new BlacklistService();
blacklistService.name = 'blacklistService';

module.exports = blacklistService;