const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const linkService = require('../../../services/general/linkService');
const Logger = require('../../../utils/logger');
const moment = require('moment-timezone');
// TODO: 防止重複綁定
module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setNameLocalizations({
            'zh-TW': '綁定帳號'
        })
        .setDescription('link your minecraft account to your discord account')
        .setDescriptionLocalizations({
            'zh-TW': '綁定你的 Minecraft 帳號到 Discord 帳號'
        })
        .addIntegerOption(option =>
            option.setName('code')
                .setNameLocalizations({
                    'zh-TW': '驗證碼'
                })
                .setDescription('The verification code you got from the bot in Minecraft')
                .setDescriptionLocalizations({
                    'zh-TW': '你在 Minecraft 中從 Bot 那裡獲得的驗證碼'
                })
                .setRequired(true)
                .setMaxValue(99999)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const linkInfo = await linkService.validateCode(interaction.user.id, interaction.options.getInteger('code'));
            if (!linkInfo.status) {
                await interaction.editReply('綁定失敗: 驗證碼錯誤或已過期，請重新在遊戲中私訊 Bot link 來取得新的驗證碼');
                return;
            }

            // TODO: custom embed
            // TODO: embed builder utils
            const embed = new EmbedBuilder()
                .setTitle("綁定成功")
                .setDescription(`玩家 ${linkInfo.playerID.replaceAll(/([^\\])_/g, '$1\\_')} 成功綁定帳號`)
                .addFields(
                    {
                        name: "玩家名稱",
                        value: linkInfo.playerID.replaceAll(/([^\\])_/g, '$1\\_'),
                        inline: true
                    },
                    {
                        name: "玩家UUID",
                        value: linkInfo.playerUUID,
                        inline: false
                    },
                    {
                        name: "Discord名稱",
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: "Discord ID",
                        value: interaction.user.id,
                        inline: true
                    },
                    {
                        name: "綁定時間",
                        value: moment(new Date()).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
                        inline: false
                    },
                )
                .setThumbnail(`https://mc-heads.net/avatar/${linkInfo.playerID}/100.png`)
                .setColor("#00b0f4")
                .setFooter({
                    text: "Jimmy Bot",
                    iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            Logger.error('[Discord.slashcommands.link] 執行指令時發生錯誤:', error);
            await interaction.editReply({ content: `綁定失敗: 綁定時發生錯誤 ${error.message}` });

            const embed = new EmbedBuilder()
                .setTitle("❌ 發生錯誤")
                .addFields(
                    {
                        name: "指令",
                        value: "link",
                        inline: true
                    },
                    {
                        name: "原因",
                        value: error.message.slice(0, 200) || "未知錯誤",
                        inline: true
                    },
                )
                .setFooter({
                    text: "Jimmy Bot",
                    iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024&format=webp&width=0&height=256",
                })
                .setTimestamp();


            await interaction.editReply({
                embeds: [embed],
            });
        }
    }
};