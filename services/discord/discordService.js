const { client } = require('../../core/client');
const Logger = require('../../utils/logger');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const toml = require('smol-toml');
const { addCommas } = require('../../utils/format');

class DiscordService {
    constructor() {
        this.configPath = path.join(__dirname, '../../config.toml');
        this.config = {};
        this.loadConfig();
    }

    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            this.config = toml.parse(data);
        } catch (error) {
            Logger.error('[DiscordService] Failed to load config:', error);
        }
    }

    async sendBetRecord(betData) {
        if (!client.dcBot) {
            return;
        }

        this.loadConfig();

        const channelId = this.config.general?.betRecordChannelID;
        if (!channelId) {
            return;
        }

        try {
            const channel = await client.dcBot.channels.fetch(channelId);
            if (!channel) {
                Logger.warn(`[DiscordService] Channel ${channelId} not found.`);
                return;
            }

            const { player, amount, currency, result, returnAmount, odds, rank } = betData;
            const isWin = result === 'win';
            const currencyIcon = currency === 'emerald' ? '💵' : '💴';

            const winEmbed = new EmbedBuilder()
                .setTitle(`${currencyIcon} [中獎] ${player}`)
                .setDescription(`下注綠寶石 \`${addCommas(amount)}\` -> \`${addCommas(returnAmount)}\` (賠率=\`${odds}\`)`)
                .setColor("#00ff1e")
                .setFooter({
                    text: "Jimmy Bot",
                    iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024",
                })
                .setTimestamp();

            const loseEmbed = new EmbedBuilder()
                .setTitle(`${currencyIcon} [未中獎] ${player}`)
                .setDescription(`下注綠寶石 \`${addCommas(amount)}\` -> \`0\` (賠率=\`${odds}\`)`)
                .setColor("#ff0000")
                .setFooter({
                    text: "Jimmy Bot",
                    iconURL: "https://cdn.discordapp.com/icons/1173075041030787233/bbf79773eab98fb335edc9282241f9fe.webp?size=1024",
                })
                .setTimestamp();

            if (isWin) {
                await channel.send({ embeds: [winEmbed] });
            } else {
                await channel.send({ embeds: [loseEmbed] });
            }

            Logger.debug(`[DiscordService] Sent bet record for ${player} to Discord.`);

        } catch (error) {
            Logger.error('[DiscordService] Failed to send bet record:', error);
        }
    }

    async sendConsoleMessage(message) {
        if (!client.dcBot) return;
        this.loadConfig();
        const channelId = this.config.general?.consoleChannelID;
        if (!channelId) return;

        try {
            const channel = await client.dcBot.channels.fetch(channelId);
            if (channel) {
                // 移除顏色代碼
                const cleanMessage = message.replace(/\u001b\[[0-9;]*m/g, '');
                if (cleanMessage == '' || !cleanMessage) return
                await channel.send({ content: `\`${cleanMessage}\``, flags: MessageFlags.SuppressNotifications });
            }
        } catch (error) {
            Logger.error(`[DiscordService] Failed to send console message: [${message}]`, error);
        }
    }

    async sendCommandLog(data) {
        if (!client.dcBot) return;
        this.loadConfig();
        const channelId = this.config.general?.consoleChannelID;
        if (!channelId) return;

        try {
            const channel = await client.dcBot.channels.fetch(channelId);
            if (!channel) return;

            const { platform, user, command, args, success = true } = data;
            
            const embed = new EmbedBuilder()
                .setTitle(`[指令紀錄] ${platform}`)
                .addFields(
                    { name: '使用者', value: user, inline: true },
                    { name: '指令', value: command, inline: true },
                    { name: '參數', value: args || '無', inline: true },
                    { name: '狀態', value: success ? '成功' : '失敗', inline: true }
                )
                .setColor(success ? "#00ff00" : "#ff0000")
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            Logger.error('[DiscordService] Failed to send command log:', error);
        }
    }

    async sendErrorLog(error, context = '') {
        if (!client.dcBot) return;
        this.loadConfig();
        const channelId = this.config.general?.consoleChannelID;
        if (!channelId) return;

        try {
            const channel = await client.dcBot.channels.fetch(channelId);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(`[錯誤通知]`)
                .setDescription(`**Context:** ${context}\n**Error:** ${error.message || error}`)
                .setColor("#ff0000")
                .setTimestamp();
            
            if (error.stack) {
                // 截斷 stack trace 以免超過 Discord 限制
                const stack = error.stack.length > 1000 ? error.stack.substring(0, 1000) + '...' : error.stack;
                embed.addFields({ name: 'Stack Trace', value: `\`\`\`js\n${stack}\n\`\`\`` });
            }

            await channel.send({ embeds: [embed] });
        } catch (err) {
            Logger.error('[DiscordService] Failed to send error log:', err);
        }
    }
}

module.exports = new DiscordService();
