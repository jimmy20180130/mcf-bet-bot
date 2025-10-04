// commands/minecraft/daily.js

const Logger = require("../../utils/logger");
const paymentService = require("../../services/paymentService");
const rankService = require("../../services/rankService");
const { addCommas } = require("../../utils/format");
const userInfoService = require("../../services/userInfoService");
const dailyRepository = require("../../repositories").dailyRepository;
const userRepository = require("../../repositories").userRepository;
const { withErrorHandling } = require("../../utils/commandHandler");
const errorHandler = require("../../services/errorHandler");

module.exports = {
    name: 'daily',
    aliases: ['daily', '簽到'],
    description: '領取每日簽到獎勵',
    usage: '/m bot daily',
    requiredPermissionLevel: 0, // default
    execute: withErrorHandling(execute),
}

async function execute(bot, playerId, args) {
    Logger.info(`[daily] ${playerId} 嘗試領取每日獎勵`);
    // TODO: implement daily
    // step:
    // 1. playerId => playeruuid (use userInfoService)
    // 2. getRank 並取得相對應的簽到金額
    // 3. dailyRespository.claimDaily
    // 4. 視結果 pay ，失敗則加到 wallet

    const playerUUID = await userInfoService.getMinecraftUUID(playerId);

    // 檢查今日是否已簽到
    // TODO: local time
    const hasClaimedToday = await dailyRepository.hasClaimedToday(playerUUID);
    if (hasClaimedToday) {
        bot.chat(`/m ${playerId} &c你今天已經簽到過了！`);
        return;
    }

    const dailyReward = await rankService.calculateDailyReward(playerUUID);
    if (!dailyReward.hasReward || (dailyReward.emerald <= 0 && dailyReward.coin <= 0)) {
        bot.chat(`/m ${playerId} &c你目前的每日簽到獎勵為零`);
        return;
    }

    // 記錄簽到
    const claimSuccess = await dailyRepository.claimDaily(playerUUID);
    if (claimSuccess) {
        // 發放獎勵
        const emeraldAmount = dailyReward.emerald;
        const coinAmount = dailyReward.coin;
        let errorFlag = { emerald: false, coin: false };
        
        if (emeraldAmount > 0) {
            await paymentService.epay(playerId, emeraldAmount)
                .catch(async err => {
                    errorFlag.emerald = true;
                    errorHandler.handleError(err, { commandName: 'daily', playerId, action: 'epay獎勵' });
                });
        }

        if (coinAmount > 0) {
            await paymentService.cpay(playerId, coinAmount)
                .catch(async err => {
                    errorFlag.coin = true;
                    errorHandler.handleError(err, { commandName: 'daily', playerId, action: 'cpay獎勵' });
                });
        }

        if (!errorFlag.emerald && !errorFlag.coin && (coinAmount > 0 || emeraldAmount > 0)) {
            Logger.info(`[daily] ${playerId} 成功領取每日獎勵: ${addCommas(emeraldAmount)} 個綠寶石和 ${addCommas(coinAmount)} 個村民錠 [${dailyReward.rankName}]`);
            bot.chat(`/m ${playerId} 成功領取[${dailyReward.rankName}]的每日獎勵: &b${addCommas(emeraldAmount)} &f個&a綠寶石&f和 &b${addCommas(coinAmount)} &f個&6村民錠`);
        } else if ((errorFlag.coin || errorFlag.emerald) && (coinAmount > 0 || emeraldAmount > 0)) {
            // 發放失敗時已加到錢包
            bot.chat(
                `/m ${playerId} 成功領取[${dailyReward.rankName}]的每日獎勵: ` +
                `&b${addCommas(emeraldAmount)} &f個&a綠寶石${errorFlag.emerald ? ' &c(已加到錢包)' : ''}&f和 ` +
                `&b${addCommas(coinAmount)} &f個&6村民錠${errorFlag.coin ? ' &c(已加到錢包)' : ''}`
            );
        }
    }
}