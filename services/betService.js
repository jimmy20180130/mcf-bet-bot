// 一般對賭
const betType = 'normal';
module.exports.type = betType;

const client = require('../core/client');
const Logger = require('../utils/logger');
const paymentService = require('./paymentService');
const errorHandler = require('./errorHandler');
const rankService = require("./rankService");
const userRepository = require('../repositories/').userRepository
const { addCommas, removeCommas } = require('../utils/format');
const { activateBlock, waitItemSpawn } = require('../utils/minecraft');
const userInfoService = require('./userInfoService');
const betRepository = require('../repositories/').betRepository
const blacklistService = require('./blacklistService');
const { BetError, UserError, PaymentError } = require('../utils/errors');

class BetService {
    constructor() {
        // TODO: implement bet task cache
        this.bets = [];
        this.bot = null;
    }

    setBot(bot) {
        this.bot = bot;
    }

    addTask(betTask) {
        // betTask = { playerId, playerUUID, amount, user, userRank }
        this.bets.push(betTask);
    }

    getTasks() {
        return this.bets;
    }

    startProcessTasks() {
        setInterval(() => {
            if (this.bets.length > 0 && this.bot) {
                const betTask = this.bets.shift();
                Logger.info(`[BetService] 處理下注任務: ${JSON.stringify(betTask)}`);
                this.processTask(betTask);
            }
        }, 500); // Check every 0.5 second
    }

    async processTask(task) {
        // return: return the amount that the user bet
        // win: return the winning amount
        // lose: don't return
        let result = 'return'
        let returnAmount = task.amount;
        try {
            // TODO: allow passing block and timeout
            result = await this._clickRedstoneDust(null, 7000);
            Logger.info(`[BetService.processTask] ${task.playerId} 下注結果: ${result}`);
            // TODO: customize win message

            // get user rank prefix
            const userPrefix = task.userRank ? task.userRank.prefix : '';

            if (result === 'win') {
                // 0.1+0.2!=0.3, to fix the problem, multiply to 10^4 and then divide to 10^4
                returnAmount = Math.floor((1.85 * 10000 + (task.userRank ? task.userRank.bonusOdds : 0) * 10000) * task.amount / 10000);
                await this._logBetResult(task, 'win', {
                    userRank: task.userRank ? task.userRank.rankName : '無',
                    bonusOdds: task.userRank ? task.userRank.bonusOdds : 0,
                    returnAmount: returnAmount
                });

                await paymentService.epay(task.playerId, returnAmount);

                // [11:11:11] &c[ADMIN] &f&lJimmy4Real &r&f贏得了 &6&l100,000,000,000 &f個&a綠寶石 &7(&f賠率: &e1.85+1&7)
                this.bot.chat(`&3[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}]&r ${userPrefix} &b&l${task.playerId} &c&l中獎 &6${addCommas(task.amount)} &7-> &6&l${addCommas(returnAmount)} &a綠寶石 &7(&e1.85${task.userRank ? `+${task.userRank.bonusOdds}` : ''}&7)`);
            } else if (result === 'lose') {
                returnAmount = 0;
                await this._logBetResult(task, 'lose', {
                    userRank: task.userRank ? task.userRank.rankName : '無',
                    bonusOdds: task.userRank ? task.userRank.bonusOdds : 0,
                    returnAmount: 0
                });
                this.bot.chat(`[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] &f&l${task.playerId} &c&l未中獎`);
            }
        } catch (error) {
            Logger.error(`[BetService.processTask] ${task.playerId} 下注失敗:`, error);
            
            // 使用新的錯誤處理系統
            const errorResult = await errorHandler.handleError(error, {
                bot: this.bot,
                playerId: task.playerId,
                playerUUID: task.playerUUID,
                operation: 'bet',
                additionalInfo: {
                    betType: betType,
                    amount: task.amount,
                    currency: 'emerald',
                    result: result
                }
            });

            // 判斷是否為超時類錯誤（超時錯誤只通知，不退款）
            const isTimeoutError = (error instanceof PaymentError && error.code === 'PAYMENT_TIMEOUT');
            
            if (isTimeoutError) {
                // 超時錯誤：只通知玩家，不退款
                // 不管黑的白的都只退回原本下注的款項
                // this.bot.chat(`/m ${task.playerId} &c偵測結果時超時，您的 &b${addCommas(task.amount)} &f個&a綠寶石&c已被扣除但未進行下注 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                if (result == 'return') {
                    this.bot.chat(`/m ${task.playerId} &f轉帳超時，若您&c沒收到 &b${addCommas(task.amount)} &f個&a綠寶石，請&c至 Discord 伺服器回報錯誤 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                } else if (result == 'win') {
                    this.bot.chat(`/m ${task.playerId} &f轉帳超時，若您&c沒收到&f您贏得的 &b${addCommas(returnAmount)} &f個&a綠寶石，請&c至 Discord 伺服器回報錯誤 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                } else if (result == 'lose') {
                    // 這三小，我不知道，應該完全不會發生
                    this.bot.chat(`/m ${task.playerId} &f轉帳超時，您未中獎 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                }
            } else {
                // 非超時錯誤：退款給玩家
                if (result === 'return') {
                    this.bot.chat(`/m ${task.playerId} &f下注失敗，已退回給您下注的 &b${addCommas(task.amount)} &f個&a綠寶石 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                    await paymentService.epay(task.playerId, returnAmount).catch(async (payError) => {
                        await errorHandler.handleError(payError, {
                            bot: this.bot,
                            playerId: task.playerId,
                            playerUUID: task.playerUUID,
                            operation: 'bet_refund',
                            additionalInfo: { amount: returnAmount, currency: 'emerald', reason: 'bet_failed' }
                        });
                    });
                } else if (result === 'lose') {
                    this.bot.chat(`/m ${task.playerId} &f下注失敗，您未中獎 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                } else if (result === 'win') {
                    this.bot.chat(`/m ${task.playerId} &f下注失敗，已退回給您贏得的 &b${addCommas(returnAmount)} &f個&a綠寶石 &7(錯誤ID: ${errorResult.errorID || '無'})`);
                    await paymentService.epay(task.playerId, returnAmount).catch(async (payError) => {
                        await errorHandler.handleError(payError, {
                            bot: this.bot,
                            playerId: task.playerId,
                            playerUUID: task.playerUUID,
                            operation: 'bet_refund',
                            additionalInfo: { amount: returnAmount, currency: 'emerald', reason: 'bet_win_failed' }
                        });
                    });
                }
            }
        }
    }

    async _logBetResult(task, result, additionalInfo = {}) {
        await betRepository.createBet({
            playerUUID: task.playerUUID,
            betType: betType,
            amount: task.amount,
            odds: 1.85,
            result: result,
            additionalInfo: {
                ...additionalInfo,
                playerId: task.playerId,
            }
        });
    }

    async _clickRedstoneDust(block = null, timeout = 10000) {
        if (!block) {
            block = await this.bot.findBlock({
                point: this.bot.entity.position,
                matching: (block) => block.name === "redstone_wire",
                maxDistance: 5,
                count: 1
            });
        }

        if (!block) throw BetError.redstoneNotFound();

        await activateBlock(this.bot, block)

        const noPermListener = this.bot.awaitMessage(/^\[領地\] 您沒有(.+)/, timeout)
        const noPermPromise = new Promise((resolve, reject) => {
            noPermListener.then(matches => {
                resolve({ type: 'noPermission', message: matches[1] });
            });
        });
        const betResPromise = waitItemSpawn(this.bot, { "180": 'win', "195": 'lose' }, timeout)
            .then(result => ({ type: 'betResult', result: result }));

        try {
            const result = await Promise.race([noPermPromise, betResPromise]);

            noPermListener.cancel();

            if (result.type === 'noPermission') {
                throw BetError.noPermission(result.message);
            } else if (result.type === 'betResult') {
                if (result.result.result === 0) {
                    // 成功獲得賭博結果
                    return result.result.data; // 'win' 或 'lose'
                } else {
                    // 等待物品生成失敗
                    Logger.debug(`[BetService._clickRedstoneDust] ${result.result}`);
                    throw BetError.redstoneTimeout();
                }
            }
        } catch (error) {
            // remove event listeners to prevent memory leak
            noPermListener.cancel();

            // 如果是 BetError 直接拋出
            if (error instanceof BetError) {
                throw error;
            }

            // 如果是超時或其他錯誤
            if (error.message && error.message.includes('timeout')) {
                throw BetError.redstoneTimeout();
            }
            throw error;
        }
    }
}

const betService = new BetService();

/**
 * 驗證玩家並處理黑名單/EULA檢查
 * @returns {Object|null} 返回驗證結果 { playerUUID, user, shouldReturn } 或 null
 */
async function validatePlayerAndBlacklist({ bot, playerId, amount, currency }) {
    const currencyConfig = {
        emerald: { name: '綠寶石', color: '&a', paymentMethod: 'epay' },
        coin: { name: '村民錠', color: '&6', paymentMethod: 'cpay' }
    };
    const config = currencyConfig[currency];

    // 檢查 UUID
    let playerUUID;
    try {
        playerUUID = await userInfoService.getMinecraftUUID(playerId);
    } catch (error) {
        await handleRefund({
            bot,
            playerId,
            amount,
            currentAmount: 0,
            currency,
            errorType: 'UUID_NOT_FOUND',
            errorMsg: `無法取得 UUID，無法下注 ${addCommas(amount)} ${config.name}`,
            refundReason: 'refund_uuid_not_found',
            chatMsg: `/m ${playerId} &f無法取得您的 UUID，已退回給您 &b${addCommas(amount)} &f個${config.color}${config.name}&f，請稍後再試`
        });
        return null;
    }

    // 確保用戶存在
    let user = await userRepository.getUserByUUID(playerUUID);
    if (!user) {
        await userRepository.createUser({ playerUUID: playerUUID, playerID: playerId });
        user = await userRepository.getUserByUUID(playerUUID);
    }

    // 檢查黑名單
    let blacklistInfo;
    try {
        blacklistInfo = await blacklistService.isBlacklisted(playerId);
    } catch (error) {
        await handleRefund({
            bot,
            playerId,
            amount,
            currentAmount: 0,
            currency,
            errorType: 'BLACKLIST_CHECK_FAILED',
            errorMsg: `無法檢查黑名單狀態，無法下注 ${addCommas(amount)} ${config.name}`,
            refundReason: 'refund_blacklist_check_failed',
            chatMsg: `/m ${playerId} &f系統錯誤，已退回給您 &b${addCommas(amount)} &f個${config.color}${config.name}&f，請稍後再試`
        });
        return null;
    }

    // 處理黑名單情況
    if (blacklistInfo.notified && blacklistInfo.result && blacklistInfo.reason != 'NO_ACCEPT_EULA') {
        // 處理被封鎖且已通知的玩家
        Logger.info(`封鎖下注: ${playerId}`);
        return null;
    } else if (blacklistInfo.result && blacklistInfo.reason != 'NO_ACCEPT_EULA') {
        // 處理被封鎖且未通知的玩家
        await bot.chat(`/m ${playerId} 您已被&c&l封鎖使用本機器人&f，&c&l若再轉帳則視為捐款&f，封鎖原因: &c&l${blacklistInfo.reason}&f，解封時間: &c&l${blacklistInfo.unbanTime == -1 ? '無限期' : new Date(blacklistInfo.unbanTime).toLocaleString('zh-TW', { hour12: false })}&f，如有疑問請洽管理員`);

        await blacklistService.updateBlacklistInfo(playerId, { notified: true });

        await paymentService[config.paymentMethod](playerId, amount)
            .then(() => { })
            .catch(async (error) => {
                await errorHandler.handleError(error, {
                    bot,
                    playerId,
                    playerUUID,
                    operation: 'payment',
                    additionalInfo: {
                        type: config.paymentMethod,
                        amount,
                        currency,
                        reason: 'blacklist_refund'
                    }
                });
            });
        return null;
    } else if (blacklistInfo.result && blacklistInfo.reason == 'NO_ACCEPT_EULA') {
        // 處理被因為未接受 EULA 而封鎖的玩家
        if (!blacklistInfo.notified) {
            // 尚未通知的則先還款
            await bot.chat(`/m ${playerId} &c您尚未接受本機器人的使用條款，請加入 Discord 伺服器並詳閱條款後，私訊我 &7[&a同意條款&7] &c後方可使用本機器人，&c&l若再轉帳則視為捐款`);

            await blacklistService.updateBlacklistInfo(playerId, {
                status: blacklistInfo.originalStatus,
                reason: blacklistInfo.originalReason,
                unbanTime: blacklistInfo.unbanTime,
                notified: true
            });

            await paymentService[config.paymentMethod](playerId, amount)
                .then(() => { })
                .catch(async (error) => {
                    await errorHandler.handleError(error, {
                        bot,
                        playerId,
                        playerUUID,
                        operation: 'payment',
                        additionalInfo: {
                            type: config.paymentMethod,
                            amount,
                            currency,
                            reason: 'eula_refund'
                        }
                    });
                });
        }
        return null;
    }

    return { playerUUID, user, shouldReturn: false };
}

/**
 * 處理下注請求的共用邏輯
 */
async function processBetRequest({ bot, playerId, amount, currentAmount, currency }) {
    const currencyConfig = {
        emerald: { name: '綠寶石', color: '&a' },
        coin: { name: '村民錠', color: '&6' }
    };
    const config = currencyConfig[currency];

    Logger.info(`[BetService.mcBotGet${currency === 'emerald' ? 'Emerald' : 'Coin'}] ${playerId} 收到${config.name}: ${amount} (目前擁有 ${currentAmount})`);
    
    currentAmount = removeCommas(currentAmount);
    amount = removeCommas(amount);

    // 驗證玩家並檢查黑名單/EULA
    const validation = await validatePlayerAndBlacklist({ bot, playerId, amount, currency });
    if (!validation) return;

    const { playerUUID, user } = validation;

    // 獲取用戶等級（僅綠寶石需要）
    const userRank = currency === 'emerald' ? await rankService.getUserRank(playerUUID) : null;

    // 檢查餘額
    if (currentAmount - amount - amount * 1.85 < 0) {
        await handleRefund({
            bot,
            playerId,
            amount,
            currentAmount,
            currency,
            errorType: 'INSUFFICIENT_BALANCE',
            errorMsg: `${config.name}餘額不足，無法下注 ${addCommas(amount)} ${config.name}`,
            refundReason: 'refund_insufficient_balance',
            chatMsg: `/m ${playerId} &fBot 餘額不足，已退回給您 &b${addCommas(amount)} &f個${config.color}${config.name}&f，請稍後再試`
        });
        return;
    }

    betService.addTask({ 
        playerId, 
        playerUUID, 
        amount, 
        user, 
        userRank: userRank?.rank || null 
    });
}

// client.emit('mcBotGetEmerald', { bot: this.bot, playerId, amount, currentAmount });
client.on('mcBotGetEmerald', async ({ bot, playerId, amount, currentAmount }) => {
    await processBetRequest({ bot, playerId, amount, currentAmount, currency: 'emerald' });
});

// client.emit('mcBotGetCoin', { bot: this.bot, playerId, amount, currentAmount });
client.on('mcBotGetCoin', async ({ bot, playerId, amount, currentAmount }) => {
    await processBetRequest({ bot, playerId, amount, currentAmount, currency: 'coin' });
});

async function handleRefund({ bot, playerId, amount, currentAmount, currency, errorType, errorMsg, refundReason, chatMsg }) {
    // 獲取玩家 UUID 用於錯誤記錄
    let playerUUID;
    try {
        playerUUID = await userInfoService.getMinecraftUUID(playerId);
    } catch (uuidError) {
        Logger.error(`[handleRefund] 無法獲取 ${playerId} 的 UUID:`, uuidError);
        playerUUID = null;
    }

    // 創建對應的錯誤並記錄
    let betError;
    switch (errorType) {
        case 'INSUFFICIENT_BALANCE':
            betError = BetError.insufficientBalance(amount, currentAmount);
            break;
        case 'UUID_NOT_FOUND':
            betError = UserError.uuidNotFound(playerId);
            break;
        default:
            betError = new BetError(errorMsg, errorType, { amount, currency, currentAmount });
    }

    const errorResult = await errorHandler.handleError(betError, {
        bot,
        playerId,
        playerUUID,
        operation: 'bet_validation',
        additionalInfo: {
            betType: module.exports.type,
            amount,
            currency,
            currentAmount,
            reason: refundReason
        }
    });

    const errorID = errorResult.errorID ? `&7(錯誤ID: ${errorResult.errorID})` : '';

    // 退款
    await paymentService[`${currency === 'emerald' ? 'epay' : 'cpay'}`](playerId, amount)
        .then(() => {
            bot.chat(`${chatMsg} ${errorID}`);
        })
        .catch(async (payError) => {
            await errorHandler.handleError(payError, {
                bot,
                playerId,
                playerUUID,
                operation: 'bet_refund',
                additionalInfo: {
                    type: currency === 'emerald' ? 'epay' : 'cpay',
                    amount,
                    currency,
                    reason: refundReason
                }
            });
        });
}

client.on('mcBotSpawned', (bot) => {
    betService.setBot(bot);
    betService.startProcessTasks();
});

module.exports = betService;