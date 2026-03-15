const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const toml = require('smol-toml');
const fs = require('fs');
const User = require('../../../models/User');
const minecraftDataService = require('../../../services/minecraftDataService');
const { tForInteraction } = require('../../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setNameLocalizations({
            'zh-TW': '設定'
        })
        .setDescription('Bot settings')
        .setDescriptionLocalizations({
            'zh-TW': 'Bot 設定'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('bet')
                .setNameLocalizations({
                    'zh-TW': '下注'
                })
                .setDescription('Bet settings')
                .setDescriptionLocalizations({
                    'zh-TW': '下注設定'
                })
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人'
                        })
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('emax')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石最大下注金額'
                        })
                        .setDescription('Maximum emerald bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石最大下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('emin')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石最小下注金額'
                        })
                        .setDescription('Minimum emerald bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石最小下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('cmax')
                        .setNameLocalizations({
                            'zh-TW': '村民錠最大下注金額'
                        })
                        .setDescription('Maximum coin bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠最大下注金額'
                        })
                )
                .addIntegerOption(option =>
                    option.setName('cmin')
                        .setNameLocalizations({
                            'zh-TW': '村民錠最小下注金額'
                        })
                        .setDescription('Minimum coin bet amount')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠最小下注金額'
                        })
                )
                .addNumberOption(option =>
                    option.setName('eodds')
                        .setNameLocalizations({
                            'zh-TW': '綠寶石賠率'
                        })
                        .setDescription('Odds for the emerald bet (Decimal, default 1.85)')
                        .setDescriptionLocalizations({
                            'zh-TW': '綠寶石下注賠率 (小數，預設 1.85)'
                        })
                )
                .addNumberOption(option =>
                    option.setName('codds')
                        .setNameLocalizations({
                            'zh-TW': '村民錠賠率'
                        })
                        .setDescription('Odds for the coin bet (Decimal, default 1.85)')
                        .setDescriptionLocalizations({
                            'zh-TW': '村民錠下注賠率 (小數，預設 1.85)'
                        })
                )

        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setNameLocalizations({
                    'zh-TW': '白名單'
                })
                .setDescription('Whitelist settings')
                .setDescriptionLocalizations({
                    'zh-TW': '白名單設定'
                })
                .addStringOption(option =>
                    option.setName('action')
                        .setNameLocalizations({
                            'zh-TW': '動作'
                        })
                        .setDescription('Action to perform')
                        .setDescriptionLocalizations({
                            'zh-TW': '要執行的動作'
                        })
                        .addChoices(
                            { name: 'add', value: 'add' },
                            { name: 'remove', value: 'remove' },
                            { name: 'list', value: 'show' },
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage (default global settings)')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人 (預設為全域設定s)'
                        })
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName('player')
                        .setNameLocalizations({
                            'zh-TW': '玩家名稱'
                        })
                        .setDescription('Player name to add/remove from whitelist (not needed for list action)')
                        .setDescriptionLocalizations({
                            'zh-TW': '要加入/移除白名單的玩家名稱 (列出白名單時不需要)'
                        })
                        .setAutocomplete(true)

                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setNameLocalizations({
                    'zh-TW': '頻道'
                })
                .setDescription('Channel settings')
                .setDescriptionLocalizations({
                    'zh-TW': '頻道設定'
                })
                .addStringOption(option =>
                    option.setName('bot')
                        .setNameLocalizations({
                            'zh-TW': '機器人'
                        })
                        .setDescription('Bot to manage')
                        .setDescriptionLocalizations({
                            'zh-TW': '要選取的機器人'
                        })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(option =>
                    option.setName('bet')
                        .setNameLocalizations({
                            'zh-TW': '下注紀錄'
                        })
                        .setDescription('Channel for bet records')
                        .setDescriptionLocalizations({
                            'zh-TW': '下注紀錄頻道'
                        })
                )
                .addChannelOption(option =>
                    option.setName('console')
                        .setNameLocalizations({
                            'zh-TW': '控制台'
                        })
                        .setDescription('Channel for console messages')
                        .setDescriptionLocalizations({
                            'zh-TW': '控制台頻道'
                        })
                )
        )
    ,

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = focusedOption.value;

        if (focusedOption.name === 'player') {
            const choices = User.searchPlayers(focusedValue);
            await interaction.respond(
                choices.map(choice => ({ name: choice.playerid, value: choice.playerid }))
            );
        } else if (focusedOption.name === 'bot') {
            const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8'));

            const choices = await Promise.all(config.bots.map(async bot => ({
                botid: await minecraftDataService.getPlayerId(bot.uuid) || bot.username,
                botuuid: bot.uuid
            }))).then(results => results.filter(bot => bot.botid.includes(focusedValue)));

            await interaction.respond(
                choices.map(choice => ({
                    name: choice.botid,
                    value: choice.botuuid
                }))
            );
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'bet':
                const bot = interaction.options.getString('bot');
                const emax = interaction.options.getInteger('emax');
                const emin = interaction.options.getInteger('emin');
                const cmax = interaction.options.getInteger('cmax');
                const cmin = interaction.options.getInteger('cmin');
                const eodds = interaction.options.getNumber('eodds');
                const codds = interaction.options.getNumber('codds');
                await betSettings(interaction, bot, emax, emin, cmax, cmin, eodds, codds);
                break;

            case 'channel':
                const channelBot = interaction.options.getString('bot');
                const betChannel = interaction.options.getChannel('bet');
                const consoleChannel = interaction.options.getChannel('console');
                await channelSettings(interaction, channelBot, betChannel ? betChannel.id : null, consoleChannel ? consoleChannel.id : null);
                break;

            case 'whitelist':
                const action = interaction.options.getString('action');
                const playerName = interaction.options.getString('player');
                const whitelistBot = interaction.options.getString('bot') || null;
                await whitelistSettings(interaction, action, playerName, whitelistBot);
                break;

        }
    },
};

function getBot(config, botIdentifier) {
    if (typeof botIdentifier === 'number') return config.bots[botIdentifier];
    const bot = config.bots.find(b => b.username === botIdentifier);
    return bot || config.bots[0];
}

async function betSettings(interaction, bot, emax, emin, cmax, cmin, eodds, codds) {
    try {
        const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8'));
        const targetBot = getBot(config, bot);

        if (emax !== null) targetBot.emax = Number(emax);
        if (emin !== null) targetBot.emin = Number(emin);
        if (cmax !== null) targetBot.cmax = Number(cmax);
        if (cmin !== null) targetBot.cmin = Number(cmin);
        if (eodds !== null) targetBot.eodds = Number(eodds);
        if (codds !== null) targetBot.codds = Number(codds);

        fs.writeFileSync(`${process.cwd()}/config.toml`, toml.stringify(config));
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.betUpdated') });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.betUpdateFailed') });
    }
}

async function channelSettings(interaction, bot, betChannel, consoleChannel) {
    try {
        const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8'));
        const targetBot = getBot(config, bot);

        if (betChannel !== null) targetBot.betRecordChannelID = String(betChannel);
        if (consoleChannel !== null) targetBot.consoleChannelID = String(consoleChannel);

        fs.writeFileSync(`${process.cwd()}/config.toml`, toml.stringify(config));
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.channelUpdated') });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.channelUpdateFailed') });
    }
}

async function whitelistSettings(interaction, action, playerName, bot) {
    try {
        const config = toml.parse(fs.readFileSync(`${process.cwd()}/config.toml`, 'utf-8'));
        const targetBot = getBot(config, bot);

        if (!targetBot.whitelist) targetBot.whitelist = [];
        const globalWhitelist = config.general?.whitelist || [];

        switch (action) {
            case 'add':
                if (!playerName) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistNeedAddPlayer') });
                    return;
                }
                if (targetBot.whitelist.includes(playerName) || globalWhitelist.includes(playerName)) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistAlreadyExists', { playerName })
                    });
                    return;
                }
                targetBot.whitelist.push(playerName);
                fs.writeFileSync(`${process.cwd()}/config.toml`, toml.stringify(config));
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.whitelistAdded', { playerName })
                });
                break;

            case 'remove':
                if (!playerName) {
                    await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistNeedRemovePlayer') });
                    return;
                }
                if (!targetBot.whitelist.includes(playerName)) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistNotExists', { playerName })
                    });
                    return;
                }
                targetBot.whitelist = targetBot.whitelist.filter(name => name !== playerName);
                fs.writeFileSync(`${process.cwd()}/config.toml`, toml.stringify(config));
                await interaction.editReply({
                    content: tForInteraction(interaction, 'dc.settings.whitelistRemoved', { playerName })
                });
                break;

            case 'show':
                if (bot) {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistBotList', {
                            botName: targetBot.username,
                            list: targetBot.whitelist ? targetBot.whitelist.join(', ') : tForInteraction(interaction, 'common.none')
                        })
                    });
                } else {
                    await interaction.editReply({
                        content: tForInteraction(interaction, 'dc.settings.whitelistGlobalList', {
                            list: globalWhitelist.length > 0 ? globalWhitelist.join(', ') : tForInteraction(interaction, 'common.none')
                        })
                    });
                }

                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: tForInteraction(interaction, 'dc.settings.whitelistUpdateFailed') });
    }
}