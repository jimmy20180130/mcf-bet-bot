const UserRepository = require('../repositories/UserRepository');
const Logger = require('../utils/logger');
const { UserError, AppError } = require('../utils/errors');
// TODO: 清理不必要的垃圾
class UserInfoService {
    constructor() {
        this.userRepository = new UserRepository();
        this.isAutoUpdateRunning = false;
        this.updateInterval = null;
        // 設定自動更新間隔 (24小時 = 24 * 60 * 60 * 1000 毫秒)
        this.autoUpdateIntervalMs = 24 * 60 * 60 * 1000;
        // TODO: local cache (works when Minecraft's service is down)
        this.cache = new Map();
        // { playeruuid: {'playerid': playerid, 'updated': timestamp} }
    }

    async getMinecraftUUID(playerid) {
        for (const [playerUUID, info] of this.cache.entries()) {
            if (info.playerid === playerid && Date.now() - info.updated < 10 * 60 * 1000) {
                return playerUUID;
            }
        }

        const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${playerid}`);
        // error:
        // {
        //     "path": "/minecraft/profile/lookup/name/${playerid}",
        //     "errorMessage": "Couldn't find any profile with name ${playerid}"
        // }
        // success:
        // {
        //     "id" : "932e7d14b5be4642920ad9012da11441",
        //     "name" : "Jimmy4Real"
        // }

        if (!response.ok) {
            throw new AppError(
                `Minecraft API 請求失敗: ${response.status}`,
                'MINECRAFT_API_ERROR',
                response.status || 500
            );
        }

        const data = await response.json();

        if (data.errorMessage || !data.id) {
            throw UserError.uuidNotFound(playerid);
        }

        this.cache.set(data.id, { playerid: data.name, updated: Date.now() });

        return data.id;
    }

    async getMinecraftName(uuid) {
        for (const playerUUID of Object.keys(this.cache)) {
            if (playerUUID === uuid && Date.now() - this.cache.get(playerUUID).updated < 10 * 60 * 1000) {
                return this.cache.get(playerUUID).playerid;
            }
        }


        // https://sessionserver.mojang.com/session/minecraft/profile/$%7Buuid%7D
        const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
        // error:
        // {
        //     "path" : "/session/minecraft/profile/${uuid}",
        //     "errorMessage" : "Not a valid UUID: ${uuid}"
        // }
        // success:
        // {
        //     "id" : "932e7d14b5be4642920ad9012da11441",
        //     "name" : "Jimmy4Real",
        //     "properties" : [ {
        //         "name" : "textures",
        //         "value" : "ewogICJ0aW1lc3RhbXAiIDogMTc1ODM4MDM5MjMzNywKICAicHJvZmlsZUlkIiA6ICI5MzJlN2QxNGI1YmU0NjQyOTIwYWQ5MDEyZGExMTQ0MSIsCiAgInByb2ZpbGVOYW1lIiA6ICJKaW1teTRSZWFsIiwKICAidGV4dHVyZXMiIDogewogICAgIlNLSU4iIDogewogICAgICAidXJsIiA6ICJodHRwOi8vdGV4dHVyZXMubWluZWNyYWZ0Lm5ldC90ZXh0dXJlL2UwZGU0YmZjMmUzMmFkYzA2ZTAzODE5OGVjMWU0MzgyZmNjMzE1OTYxMmYyZTMwNWVlNTE4NTZlZDlkMDJjOTgiCiAgICB9CiAgfQp9"
        //     } ],
        //     "profileActions" : [ ]
        // }

        if (!response.ok) {
            throw new AppError(
                `Minecraft Session API 請求失敗: ${response.status}`,
                'MINECRAFT_API_ERROR',
                response.status || 500
            );
        }

        const data = await response.json();

        if (data.errorMessage || !data.name) {
            throw new AppError(
                `無法取得玩家名稱: ${data.errorMessage || 'UUID 無效'}`,
                'INVALID_UUID'
            );
        }

        this.cache.set(uuid, { playerid: data.name, updated: Date.now() });

        return data.name;
    }

    /**
     * 同步單個用戶的 Minecraft 資訊
     * @param {string} playerUUID - 玩家 UUID
     * @returns {Promise<Object>} 同步結果
     */
    async syncUserInfo(playerUUID) {
        Logger.debug(`[UserInfoService.syncUserInfo] 開始同步用戶資訊: ${playerUUID}`);

        // 獲取現有用戶資料
        const existingUser = await this.userRepository.getUserByUUID(playerUUID);
        if (!existingUser) {
            throw UserError.notFound(playerUUID);
        }

            // 獲取最新的 Minecraft 用戶名
            const latestPlayerName = await this.getMinecraftName(playerUUID);
            
            const result = {
                playerUUID,
                updated: false,
                changes: {},
                errors: []
            };

            // 檢查用戶名是否有變化
            if (existingUser.playerID !== latestPlayerName) {
                Logger.info(`[UserInfoService.syncUserInfo] 用戶 ${playerUUID} 名稱變更: ${existingUser.playerID} -> ${latestPlayerName}`);
                
                const updateSuccess = await this.userRepository.updateUser(playerUUID, {
                    playerID: latestPlayerName,
                    additionalInfo: {
                        ...existingUser.additionalInfo,
                        lastNameUpdate: Math.floor(Date.now() / 1000),
                        previousNames: [
                            ...(existingUser.additionalInfo?.previousNames || []),
                            {
                                name: existingUser.playerID,
                                changedAt: Math.floor(Date.now() / 1000)
                            }
                        ].slice(-10) // 只保留最近 10 個歷史名稱
                    }
                });

                if (updateSuccess) {
                    result.updated = true;
                    result.changes.playerID = {
                        from: existingUser.playerID,
                        to: latestPlayerName
                    };
                } else {
                    result.errors.push('更新用戶名失敗');
                }
            }

            // 更新最後同步時間
            await this.userRepository.updateUser(playerUUID, {
                additionalInfo: {
                    ...existingUser.additionalInfo,
                    lastSyncTime: Math.floor(Date.now() / 1000)
                }
            });

        Logger.debug(`[UserInfoService.syncUserInfo] 用戶 ${playerUUID} 同步完成，有變更: ${result.updated}`);
        return result;
    }

    /**
     * 根據用戶名同步用戶資訊 (當只知道用戶名時使用)
     * @param {string} playerName - 玩家名稱
     * @returns {Promise<Object>} 同步結果
     */
    async syncUserInfoByName(playerName) {
        Logger.debug(`[UserInfoService.syncUserInfoByName] 開始同步用戶資訊: ${playerName}`);

        // 先獲取 UUID
        const playerUUID = await this.getMinecraftUUID(playerName);
        
        // 使用 UUID 進行同步
        return await this.syncUserInfo(playerUUID);
    }

    /**
     * 批量同步所有用戶的 Minecraft 資訊
     * @param {Object} options - 同步選項
     * @param {number} options.batchSize - 批量處理大小 (預設 10)
     * @param {number} options.delayMs - 每批次間的延遲時間毫秒 (預設 1000)
     * @param {boolean} options.skipRecentlyUpdated - 是否跳過最近已更新的用戶 (預設 true)
     * @param {number} options.skipThresholdHours - 跳過閾值小時數 (預設 12)
     * @returns {Promise<Object>} 批量同步結果
     */
    async syncAllUsersInfo(options = {}) {
        const {
            batchSize = 10,
            delayMs = 1000,
            skipRecentlyUpdated = true,
            skipThresholdHours = 12
        } = options;

        Logger.info('[UserInfoService.syncAllUsersInfo] 開始批量同步所有用戶資訊');
        
        // 獲取所有用戶
        const allUsers = await this.userRepository.getAllUsers();
        Logger.info(`[UserInfoService.syncAllUsersInfo] 找到 ${allUsers.length} 個用戶`);

            // 過濾需要更新的用戶
            let usersToUpdate = allUsers;
            if (skipRecentlyUpdated) {
                const skipThresholdMs = skipThresholdHours * 60 * 60 * 1000;
                const currentTime = Date.now();
                
                usersToUpdate = allUsers.filter(user => {
                    const lastSyncTime = user.additionalInfo?.lastSyncTime;
                    if (!lastSyncTime) return true; // 沒有同步記錄的用戶需要更新
                    
                    const lastSyncMs = lastSyncTime * 1000;
                    return (currentTime - lastSyncMs) > skipThresholdMs;
                });
                
                Logger.info(`[UserInfoService.syncAllUsersInfo] 過濾後需要更新的用戶: ${usersToUpdate.length} 個`);
            }

            const results = {
                total: allUsers.length,
                processed: 0,
                updated: 0,
                errors: 0,
                skipped: allUsers.length - usersToUpdate.length,
                details: []
            };

            // 分批處理用戶
            for (let i = 0; i < usersToUpdate.length; i += batchSize) {
                const batch = usersToUpdate.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(usersToUpdate.length / batchSize);
                
                Logger.info(`[UserInfoService.syncAllUsersInfo] 處理批次 ${batchNumber}/${totalBatches} (${batch.length} 個用戶)`);

                // 並行處理當前批次
                const batchPromises = batch.map(user => this.syncUserInfo(user.playerUUID));
                const batchResults = await Promise.allSettled(batchPromises);

                // 處理批次結果
                batchResults.forEach((result, index) => {
                    const user = batch[index];
                    results.processed++;

                    if (result.status === 'fulfilled') {
                        const syncResult = result.value;
                        if (syncResult.updated) {
                            results.updated++;
                        }
                        if (syncResult.errors.length > 0) {
                            results.errors++;
                        }
                        results.details.push(syncResult);
                    } else {
                        results.errors++;
                        results.details.push({
                            playerUUID: user.playerUUID,
                            updated: false,
                            changes: {},
                            errors: [`Promise rejected: ${result.reason}`]
                        });
                    }
                });

                // 如果不是最後一批，則等待指定時間
                if (i + batchSize < usersToUpdate.length && delayMs > 0) {
                    Logger.debug(`[UserInfoService.syncAllUsersInfo] 等待 ${delayMs}ms 後處理下一批次`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

        Logger.info(`[UserInfoService.syncAllUsersInfo] 批量同步完成: 處理 ${results.processed} 個，更新 ${results.updated} 個，錯誤 ${results.errors} 個，跳過 ${results.skipped} 個`);
        return results;
    }

    /**
     * 延遲執行函數
     * @param {number} ms - 延遲毫秒數
     * @returns {Promise}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports = new UserInfoService();