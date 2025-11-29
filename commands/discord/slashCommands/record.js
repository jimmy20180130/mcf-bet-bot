const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { betRepository, userRepository } = require('../../../repositories');
const Logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('record')
        .setNameLocalizations({
            'zh-TW': '下注記錄'
        })
        .setDescription("Query a player's bet records")
        .setDescriptionLocalizations({
            'zh-TW': '查詢指定玩家的下注記錄'
        })
        .addStringOption(option =>
            option.setName('player')
                .setNameLocalizations({
                    'zh-TW': '玩家'
                })
                .setDescription("Player name or UUID (leave blank for your own records)")
                .setDescriptionLocalizations({
                    'zh-TW': '玩家名稱或UUID，若不填則查詢自己的記錄 (需先綁定帳號，且無法與 discord user 選項同時使用)'
                })
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addMentionableOption(option =>
            option.setName('discorduser')
                .setNameLocalizations({
                    'zh-TW': 'dc使用者'
                })
                .setDescription("Discord user ID (must bind account first; cannot use with 'player')")
                .setDescriptionLocalizations({
                    'zh-TW': 'Discord 使用者的 ID (需先綁定帳號，且無法與 player 選項同時使用)'
                })
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('advanced')
                .setNameLocalizations({
                    'zh-TW': '進階結果'
                })
                .setDescription('[Admins only] Show profit and extra info, default false')
                .setDescriptionLocalizations({
                    'zh-TW': '[僅管理員可使用] 是否顯示盈虧及其他資訊，預設為否'
                })
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('public')
                .setNameLocalizations({
                    'zh-TW': '公開'
                })
                .setDescription('Make result public, default false')
                .setDescriptionLocalizations({
                    'zh-TW': '是否公開查詢結果，預設為否'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('later_than')
                .setNameLocalizations({
                    'zh-TW': '綠寶石晚於'
                })
                .setDescription('Filter records after this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選晚於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('earlier_than')
                .setNameLocalizations({
                    'zh-TW': '綠寶石早於'
                })
                .setDescription('Filter records before this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選早於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('date_range')
                .setNameLocalizations({
                    'zh-TW': '綠寶石時間範圍'
                })
                .setDescription('Custom date range (yyyy-mm-dd~yyyy-mm-dd or yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂日期期間 (格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('greater_than')
                .setNameLocalizations({
                    'zh-TW': '綠寶石大於等於'
                })
                .setDescription('Filter records with amount greater than or equal to value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額大於等於此數值的記錄'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('less_than')
                .setNameLocalizations({
                    'zh-TW': '綠寶石小於等於'
                })
                .setDescription('Filter records with amount less than or equal to value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額小於等於此數值的記錄'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('amount_range')
                .setNameLocalizations({
                    'zh-TW': '綠寶石金額範圍'
                })
                .setDescription('Custom amount range (min<=x<=max, e.g. 1<=x<=100)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂金額範圍 (格式: 最小值<=x<=最大值，例如: 1<=x<=100)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('coin_later_than')
                .setNameLocalizations({
                    'zh-TW': '村民錠晚於'
                })
                .setDescription('[Coin] Filter records after this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選晚於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('coin_earlier_than')
                .setNameLocalizations({
                    'zh-TW': '村民錠早於'
                })
                .setDescription('Filter records before this date (yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選早於此日期的記錄 (格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('coin_date_range')
                .setNameLocalizations({
                    'zh-TW': '村民錠時間範圍'
                })
                .setDescription('Custom date range (yyyy-mm-dd~yyyy-mm-dd or yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂日期期間 (格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('coin_greater_than')
                .setNameLocalizations({
                    'zh-TW': '村民錠大於等於'
                })
                .setDescription('Filter records with amount greater than or equal to value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額大於等於此數值的記錄'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('coin_less_than')
                .setNameLocalizations({
                    'zh-TW': '村民錠小於等於'
                })
                .setDescription('Filter records with amount less than or equal to value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額小於等於此數值的記錄'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('coin_amount_range')
                .setNameLocalizations({
                    'zh-TW': '村民錠金額範圍'
                })
                .setDescription('Custom amount range (min<=x<=max, e.g. 1<=x<=100)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂金額範圍 (格式: 最小值<=x<=最大值，例如: 1<=x<=100)'
                })
                .setRequired(false)
        ),
    
    autocomplete,
    execute
};

async function autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'player') {
        try {
            const allUsers = await userRepository.getAllUsers();
            const input = focusedOption.value.toLowerCase();
            
            // 同時搜尋玩家名稱和 UUID
            const filtered = allUsers.filter(user =>
                user.playerID.toLowerCase().includes(input) ||
                user.playerUUID.toLowerCase().includes(input)
            );
            
            // 返回最多 25 個結果（Discord 限制）
            const choices = filtered.slice(0, 25).map(user => ({
                name: `${user.playerID} (${user.playerUUID.substring(0, 8)}...)`,
                value: user.playerID
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            Logger.error('[record.autoComplete] 取得玩家列表失敗:', error);
            // 失敗時返回空列表
            await interaction.respond([]);
        }
    }
}

async function execute(interaction) {
    // TODO: complete record command
    const playerOption = interaction.options.getString('player');
    const discordUserOption = interaction.options.getMentionable('discorduser');
    const advancedOption = interaction.options.getBoolean('advanced') || false;
    const publicOption = interaction.options.getBoolean('public') || false;
    const laterThanOption = interaction.options.getString('later_than');
    const earlierThanOption = interaction.options.getString('earlier_than');
    const dateRangeOption = interaction.options.getString('date_range');
    const greaterThanOption = interaction.options.getInteger('greater_than');
    const lessThanOption = interaction.options.getInteger('less_than');
    const amountRangeOption = interaction.options.getString('amount_range');
    const coinLaterThanOption = interaction.options.getString('coin_later_than');
    const coinEarlierThanOption = interaction.options.getString('coin_earlier_than');
    const coinDateRangeOption = interaction.options.getString('coin_date_range');
    const coinGreaterThanOption = interaction.options.getInteger('coin_greater_than');
    const coinLessThanOption = interaction.options.getInteger('coin_less_than');
    const coinAmountRangeOption = interaction.options.getString('coin_amount_range');

    if (!publicOption) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    } else {
        await interaction.deferReply();
    }

    // 時間篩選：date_range 不能和 later_than/earlier_than 任何一個同時使用
    if (dateRangeOption && (laterThanOption || earlierThanOption)) {
        await interaction.editReply({ content: '綠寶石時間篩選只能選擇「晚於/早於」或「時間範圍」其中一種方式。', flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 金額篩選：amount_range 不能和 greater_than/less_than 任何一個同時使用
    if (amountRangeOption && (greaterThanOption || lessThanOption)) {
        await interaction.editReply({ content: '綠寶石金額篩選只能選擇「大於等於/小於等於」或「金額範圍」其中一種方式。', flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 村民錠時間篩選：coin_date_range 不能和 coin_later_than/coin_earlier_than 任何一個同時使用
    if (coinDateRangeOption && (coinLaterThanOption || coinEarlierThanOption)) {
        await interaction.editReply({ content: '村民錠時間篩選只能選擇「晚於/早於」或「時間範圍」其中一種方式。', flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 村民錠金額篩選：coin_amount_range 不能和 coin_greater_than/coin_less_than 任何一個同時使用
    if (coinAmountRangeOption && (coinGreaterThanOption || coinLessThanOption)) {
        await interaction.editReply({ content: '村民錠金額篩選只能選擇「大於等於/小於等於」或「金額範圍」其中一種方式。', flags: [MessageFlags.Ephemeral] });
        return;
    }

    if (playerOption && discordUserOption) {
        await interaction.editReply({ content: '玩家選項與 Discord 使用者選項無法同時使用。', flags: [MessageFlags.Ephemeral] });
        return;
    }

    // check user permissions
    const user = await userRepository.getUserByDiscordID(interaction.user.id);
    console.log(user)
    if (!user) {
        await interaction.editReply('⚠️ 請先綁定帳號後再使用此指令');
        return;
    }

    if (advancedOption && !interaction.member.permissions.has('Administrator')) {
        await interaction.editReply('❌ 進階結果僅限管理員使用');
        return;
    }

    // 把時間選項轉換成 unix timestamp
    function parseDateTime(dateStr) {
        if (!dateStr) return null;
        
        // 支援格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss
        const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/;
        const match = dateStr.match(dateTimePattern);
        
        if (!match) {
            throw new Error(`日期格式錯誤: ${dateStr}`);
        }
        
        const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
        
        // 建立 Date 物件 (月份需要減 1，因為 JavaScript 月份從 0 開始)
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                             parseInt(hour), parseInt(minute), parseInt(second));
        
        // 返回 Unix timestamp (秒)
        return Math.floor(date.getTime() / 1000);
    }

    let laterThanTimestamp = null;
    let earlierThanTimestamp = null;
    let coinLaterThanTimestamp = null;
    let coinEarlierThanTimestamp = null;

    try {
        // 處理綠寶石 date_range 選項
        if (dateRangeOption) {
            const [startDate, endDate] = dateRangeOption.split('~').map(s => s.trim());
            if (!startDate || !endDate) {
                await interaction.editReply({ content: '❌ 綠寶石時間範圍格式錯誤，請使用格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss', flags: [MessageFlags.Ephemeral] });
                return;
            }
            laterThanTimestamp = parseDateTime(startDate);
            earlierThanTimestamp = parseDateTime(endDate);
        } else {
            // 處理單獨的 later_than 和 earlier_than 選項
            if (laterThanOption) {
                laterThanTimestamp = parseDateTime(laterThanOption);
            }
            if (earlierThanOption) {
                earlierThanTimestamp = parseDateTime(earlierThanOption);
            }
        }

        // 處理村民錠 coin_date_range 選項
        if (coinDateRangeOption) {
            const [startDate, endDate] = coinDateRangeOption.split('~').map(s => s.trim());
            if (!startDate || !endDate) {
                await interaction.editReply({ content: '❌ 村民錠時間範圍格式錯誤，請使用格式: yyyy-mm-dd~yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss~yyyy-mm-dd hh:mm:ss', flags: [MessageFlags.Ephemeral] });
                return;
            }
            coinLaterThanTimestamp = parseDateTime(startDate);
            coinEarlierThanTimestamp = parseDateTime(endDate);
        } else {
            // 處理單獨的 coin_later_than 和 coin_earlier_than 選項
            if (coinLaterThanOption) {
                coinLaterThanTimestamp = parseDateTime(coinLaterThanOption);
            }
            if (coinEarlierThanOption) {
                coinEarlierThanTimestamp = parseDateTime(coinEarlierThanOption);
            }
        }
    } catch (error) {
        await interaction.editReply({ content: `❌ ${error.message}\n請使用格式: yyyy-mm-dd 或 yyyy-mm-dd hh:mm:ss`, flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 處理綠寶石金額範圍
    let minAmount = 0;  // 預設最小值為 0
    let maxAmount = null;  // 預設最大值為無限 (null)

    try {
        if (amountRangeOption) {
            // 解析格式: min<=x<=max
            const amountPattern = /^(\d+)<=x<=(\d+)$/;
            const match = amountRangeOption.match(amountPattern);
            
            if (!match) {
                await interaction.editReply({ content: '❌ 綠寶石金額範圍格式錯誤，請使用格式: 最小值<=x<=最大值 (例如: 1<=x<=100)', flags: [MessageFlags.Ephemeral] });
                return;
            }
            
            const [, min, max] = match;
            minAmount = parseInt(min);
            maxAmount = parseInt(max);
            
            if (minAmount > maxAmount) {
                await interaction.editReply({ content: '❌ 綠寶石最小值不能大於最大值', flags: [MessageFlags.Ephemeral] });
                return;
            }
        } else {
            // 使用 greater_than 和 less_than 選項
            if (greaterThanOption !== null) {
                minAmount = greaterThanOption;
            }
            if (lessThanOption !== null) {
                maxAmount = lessThanOption;
            }
        }
    } catch (error) {
        await interaction.editReply({ content: `❌ ${error.message}`, flags: [MessageFlags.Ephemeral] });
        return;
    }

    // 處理村民錠金額範圍
    let coinMinAmount = 0;  // 預設最小值為 0
    let coinMaxAmount = null;  // 預設最大值為無限 (null)

    try {
        if (coinAmountRangeOption) {
            // 解析格式: min<=x<=max
            const amountPattern = /^(\d+)<=x<=(\d+)$/;
            const match = coinAmountRangeOption.match(amountPattern);
            
            if (!match) {
                await interaction.editReply({ content: '❌ 村民錠金額範圍格式錯誤，請使用格式: 最小值<=x<=最大值 (例如: 1<=x<=100)', flags: [MessageFlags.Ephemeral] });
                return;
            }
            
            const [, min, max] = match;
            coinMinAmount = parseInt(min);
            coinMaxAmount = parseInt(max);
            
            if (coinMinAmount > coinMaxAmount) {
                await interaction.editReply({ content: '❌ 村民錠最小值不能大於最大值', flags: [MessageFlags.Ephemeral] });
                return;
            }
        } else {
            // 使用 coin_greater_than 和 coin_less_than 選項
            if (coinGreaterThanOption !== null) {
                coinMinAmount = coinGreaterThanOption;
            }
            if (coinLessThanOption !== null) {
                coinMaxAmount = coinLessThanOption;
            }
        }
    } catch (error) {
        await interaction.editReply({ content: `❌ ${error.message}`, flags: [MessageFlags.Ephemeral] });
        return;
    }

    const betData = await betRepository.getUserBets(user.playerUUID, {
        timeRange: { laterThan: laterThanTimestamp, earlierThan: earlierThanTimestamp },
        amount: { minAmount, maxAmount },
        coinTimeRange: { laterThan: coinLaterThanTimestamp, earlierThan: coinEarlierThanTimestamp },
        coinAmount: { minAmount: coinMinAmount, maxAmount: coinMaxAmount },
        advanced: advancedOption
    });

    console.log(betData);
    // betdata
    // {
    //     totalEmeraldBets: 7,
    //     totalEmeraldBetAmount: 700,
    //     winEmeraldBetAmount: 370,
    //     casinoEmeraldProfit: 330,
    //     totalCoinBets: 2,
    //     totalCoinBetAmount: 2,
    //     winCoinBetAmount: 1,
    //     casinoCoinProfit: 1,
    // }

    const timeRangeField = laterThanOption ? `晚於 ${laterThanOption}` :
        earlierThanOption ? `早於 ${earlierThanOption}` :
            dateRangeOption ? `期間 ${dateRangeOption}` : '無時間篩選';

    const moneyRangeField = greaterThanOption ? `大於等於 ${greaterThanOption}` :
        lessThanOption ? `小於等於 ${lessThanOption}` :
            amountRangeOption ? `範圍 ${amountRangeOption}` : '無金額篩選';

    const coinTimeRangeField = coinLaterThanOption ? `晚於 ${coinLaterThanOption}` :
        coinEarlierThanOption ? `早於 ${coinEarlierThanOption}` :
            coinDateRangeOption ? `期間 ${coinDateRangeOption}` : '無時間篩選';

    const coinMoneyRangeField = coinGreaterThanOption ? `大於等於 ${coinGreaterThanOption}` :
        coinLessThanOption ? `小於等於 ${coinLessThanOption}` :
            coinAmountRangeOption ? `範圍 ${coinAmountRangeOption}` : '無金額篩選';

    function formatStats({ bet, win, count }, showDetailed) {
        if (showDetailed) {
            return [
                `下注金額: ${bet} | 下注次數: ${count}`,
                `贏得金額: ${win} | 賭場盈虧: ${bet - win}`
            ].join('\n');
        }
        return `下注金額: ${bet} | 下注次數: ${count}`;
    }

    const emeraldResult = formatStats({
        bet: betData.totalEmeraldBetAmount,
        win: betData.winEmeraldBetAmount,
        count: betData.totalEmeraldBets
    }, advancedOption);

    const coinResult = formatStats({
        bet: betData.totalCoinBetAmount,
        win: betData.winCoinBetAmount,
        count: betData.totalCoinBets
    }, advancedOption);

    const imageUrl = user.playerID === '所有人'
        ? 'https://xi11.cc/wool'
        : `https://minotar.net/helm/${user.playerUUID}/64.png`;

    const embed = new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle('流水查詢')
        .addFields(
            { name: '玩家 ID', value: user.playerID, inline: true },
            { name: 'Discord', value: user.discordID ? `<@${user.discordID}>` : '尚未綁定', inline: true },
            // { name: '查詢場所', value: interaction.guild.name, inline: true },
            { name: '玩家 UUID', value: user.playerUUID, inline: false },
            { name: '綠寶石查詢期間', value: timeRangeField, inline: false },
            { name: '綠寶石金額限制', value: moneyRangeField, inline: false },
            { name: '綠寶石', value: emeraldResult, inline: false },
            { name: '村民錠查詢期間', value: coinTimeRangeField, inline: false },
            { name: '村民錠金額限制', value: coinMoneyRangeField, inline: false },
            { name: '村民錠', value: coinResult, inline: false },
        )
        .setColor("#313338")
        .setThumbnail(imageUrl)
        .setFooter({ text: 'Jimmy Bot', iconURL: 'https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    //await interaction.editReply('此指令尚在開發中，請稍後再試。');
}