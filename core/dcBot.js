const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const toml = require('smol-toml');

class DcBot {
    constructor() {
        this.logger = new Logger('Discord');
        this.commands = new Collection();
        this.interactions = new Collection();
        this.config = this._loadConfig();
        
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
    }

    _loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'config.toml');
            const configContent = fs.readFileSync(configPath, 'utf-8');
            return toml.parse(configContent);
        } catch (error) {
            this.logger.warn('無法讀取設定檔:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this._loadSlashCommands();
            await this._loadInteractions();

            this._setupEvents();
            const botConfig = this.config.discord;
            if (!botConfig || !botConfig.discordBotToken) {
                throw new Error('找不到 Discord Bot Token');
            }

            await this.client.login(botConfig.discordBotToken);

            if (botConfig.discordApplicationID) {
                await this._registerCommands(botConfig.discordBotToken, botConfig.discordApplicationID);
            } else {
                throw new Error('找不到 Discord Application ID');
            }

        } catch (error) {
            this.logger.error('Discord Bot 啟動失敗:', error);
        }
    }

    async _loadSlashCommands() {
        const commandsPath = path.join(__dirname, '../commands/discord/slash');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    this.commands.set(command.data.name, command);
                    this.logger.debug(`已載入指令: ${command.data.name}`);
                } else {
                    this.logger.warn(`${file} 缺少必要的 "data" 或 "execute" 屬性`);
                }
            } catch (error) {
                this.logger.warn(`載入 ${file} 時發生錯誤:`, error);
            }
        }
    }

    async _loadInteractions() {
        const interactionsPath = path.join(__dirname, '../commands/discord/interactions');
        const interactionFiles = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));

        for (const file of interactionFiles) {
            const filePath = path.join(interactionsPath, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const interaction = require(filePath);

                if ('name' in interaction && 'execute' in interaction) {
                    this.interactions.set(interaction.name, interaction);
                    this.logger.debug(`已載入 interactions command: ${interaction.name}`);
                } else {
                    this.logger.warn(`${file} 缺少必要的 "name" 或 "execute" 屬性`);
                }
            } catch (error) {
                this.logger.warn(`載入 ${file} 時發生錯誤:`, error);
            }
        }
    }

    async _registerCommands(token, applicationId) {
        const commands = [];
        this.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST().setToken(token);

        try {
            this.logger.info(`開始重新整理 ${commands.length} 個應用程式 (/) 指令。`);

            const data = await rest.put(
                Routes.applicationCommands(applicationId),
                { body: commands },
            );

            this.logger.info(`成功重新載入 ${data.length} 個應用程式 (/) 指令。`);
        } catch (error) {
            this.logger.warn('註冊指令時發生錯誤:', error);
        }
    }

    _setupEvents() {
        this.client.once(Events.ClientReady, c => {
            this.logger.info(`已登入為 ${c.user.tag}`);
        });

        this.client.on(Events.InteractionCreate, async interaction => {
            await this._handleInteraction(interaction);
        });
    }

    async _handleInteraction(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = this.commands.get(interaction.commandName);

            if (!command) {
                this.logger.warn(`找不到指令 ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                this.logger.warn(`執行指令時發生錯誤:`, error);
                const content = '執行指令時發生錯誤！';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content, ephemeral: true });
                } else {
                    await interaction.reply({ content, ephemeral: true });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = this.commands.get(interaction.commandName);

            if (!command) {
                this.logger.warn(`autocomplete command not found: ${interaction.commandName}`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                this.logger.error(`autocomplete error:`, error);
            }
        } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isMentionableSelectMenu()) {
            const customId = interaction.customId;
            let handler = this.interactions.get(customId);
            
            if (!handler) {
                // "record_123" => prefix = "record"
                const prefix = customId.split('_')[0];
                handler = this.interactions.get(prefix);
            }

            if (!handler) {
                return;
            }

            try {
                await handler.execute(interaction);
            } catch (error) {
                this.logger.warn(`執行互動處理時發生錯誤:`, error);
                if (!interaction.replied && !interaction.deferred) {
                     await interaction.reply({ content: '處理互動時發生錯誤！', ephemeral: true });
                }
            }
        }
    }
}

module.exports = DcBot;
