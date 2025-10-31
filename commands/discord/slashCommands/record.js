const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
                    'zh-TW': '晚於'
                })
                .setDescription('Filter records after this date (yy-mm-dd or yy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選晚於此日期的記錄 (格式: yy-mm-dd 或 yy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('earlier_than')
                .setNameLocalizations({
                    'zh-TW': '早於'
                })
                .setDescription('Filter records before this date (yy-mm-dd or yy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選早於此日期的記錄 (格式: yy-mm-dd 或 yy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('date_range')
                .setNameLocalizations({
                    'zh-TW': '時間範圍'
                })
                .setDescription('Custom date range (yy-mm-dd~yy-mm-dd or yy-mm-dd hh:mm:ss~yy-mm-dd hh:mm:ss)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂日期期間 (格式: yy-mm-dd~yy-mm-dd 或 yy-mm-dd hh:mm:ss~yy-mm-dd hh:mm:ss)'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('greater_than')
                .setNameLocalizations({
                    'zh-TW': '大於'
                })
                .setDescription('Filter records with amount greater than value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額大於此數值的記錄'
                })
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('less_than')
                .setNameLocalizations({
                    'zh-TW': '小於'
                })
                .setDescription('Filter records with amount less than value')
                .setDescriptionLocalizations({
                    'zh-TW': '篩選金額小於此數值的記錄'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('amount_range')
                .setNameLocalizations({
                    'zh-TW': '金額範圍'
                })
                .setDescription('Custom amount range (min<=x<=max, e.g. 1<=x<=100)')
                .setDescriptionLocalizations({
                    'zh-TW': '自訂金額範圍 (格式: 最小值<=x<=最大值，例如: 1<=x<=100)'
                })
                .setRequired(false)
        ),

    execute
};

async function execute(interaction) {
    // TODO: complete record command    
}