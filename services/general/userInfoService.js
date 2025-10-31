const UserRepository = require('../../repositories/UserRepository');
const Logger = require('../../utils/logger');
const { UserError, AppError } = require('../../utils/errors');
// TODO: 清理不必要的垃圾
class UserInfoService {
    constructor() {
        this.userRepository = new UserRepository();
        // TODO: local cache (works when Minecraft's service is down)
        this.cache = new Map();
        // { playeruuid: {'playerid': playerid, 'updated': timestamp} }
    }

    async init() {
        Logger.debug('[UserInfoService.init] 初始化 UserInfoService');
    }

    async cleanup() {
        Logger.debug('[UserInfoService.cleanup] 清理 UserInfoService');
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

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

const userInfoService = new UserInfoService();
userInfoService.name = 'userInfoService';

module.exports = userInfoService;