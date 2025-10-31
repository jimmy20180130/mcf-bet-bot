const Logger = require('../../utils/logger');
const { client } = require('../../core/client');

class ChatService {
    constructor() {
        this.eventHandlers = [];
        this.messages = [];
        this.chatInterval = null;
    }

    init() {
        Logger.debug('[ChatService.init] 初始化 ChatService');

        this.startChatInterval();
    }

    cleanup() {
        Logger.debug('[ChatService.cleanup] 清理 ChatService');

        if (this.chatInterval) {
            clearTimeout(this.chatInterval);
            this.chatInterval = null;
        }
    }

    startChatInterval() {
        if (this.chatInterval) return;
        const pattern = [700, 700, 700, 700, 700, 1500, 1500]; // 五則 700ms，兩則 1500ms
        let idx = 0;
        const tick = async () => {
            try {
                await this.chat();
            } catch (e) {
                Logger.debug(`[ChatService.startChatInterval] chat error: ${e.message}`);
            }
            idx = (idx + 1) % pattern.length;
            this.chatInterval = setTimeout(tick, pattern[idx]);
        };
        // 開始循環（第一次在 pattern[0] 後發送）
        this.chatInterval = setTimeout(tick, pattern[0]);
    }

    addMessage(message) {
        // replace § with &
        message = message.replace(/§/g, '&');
        this.messages.push(message);
    }

    async chat() {
        if (!client.mcBot || !client.mcBot.chat) {
            // Logger.debug('[ChatService.chat] Bot 尚未啟動，無法發送訊息');
            return;
        }
        if (this.messages.length === 0) return;
        const message = this.messages.shift();
        Logger.debug(`[ChatService.chat] 發送聊天訊息: ${message}`);
        await client.mcBot.chat(message);
    }
}

const chatService = new ChatService();

chatService.name = 'chatService';

module.exports = chatService;