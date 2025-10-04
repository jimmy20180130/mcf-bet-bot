const Vec3 = require('vec3');

/**
 * 激活方塊（點擊方塊）
 * @param {Object} bot - Minecraft bot 實例
 * @param {Object} block - 方塊對象
 */
async function activateBlock(bot, block) {
    function vectorToDirection(v) {
        if (v.y < 0) {
            return 0;
        } else if (v.y > 0) {
            return 1;
        } else if (v.z < 0) {
            return 2;
        } else if (v.z > 0) {
            return 3;
        } else if (v.x < 0) {
            return 4;
        } else if (v.x > 0) {
            return 5;
        }
    }

    const direction = new Vec3(0, 1, 0);
    const directionNum = vectorToDirection(direction);
    const cursorPos = new Vec3(0.5, 0.5, 0.5);

    if (bot.supportFeature('blockPlaceHasHeldItem')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            heldItem: Item.toNotch(bot.heldItem),
            cursorX: cursorPos.scaled(16).x,
            cursorY: cursorPos.scaled(16).y,
            cursorZ: cursorPos.scaled(16).z
        });
    } else if (bot.supportFeature('blockPlaceHasHandAndIntCursor')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.scaled(16).x,
            cursorY: cursorPos.scaled(16).y,
            cursorZ: cursorPos.scaled(16).z
        });
    } else if (bot.supportFeature('blockPlaceHasHandAndFloatCursor')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.x,
            cursorY: cursorPos.y,
            cursorZ: cursorPos.z
        });
    } else if (bot.supportFeature('blockPlaceHasInsideBlock')) {
        bot._client.write('block_place', {
            location: block.position,
            direction: directionNum,
            hand: 0,
            cursorX: cursorPos.x,
            cursorY: cursorPos.y,
            cursorZ: cursorPos.z,
            insideBlock: false
        });
    }
}

/**
 * 等待指定物品 ID 生成，並在生成後回傳生成了什麼東西
 * @param {Object} bot - bot 實例
 * @param {Object.<string, any>} data - 物品 ID 和對應數據的對象
 * @param {number} timeout - 超時時間，預設為 10000 毫秒
 * @returns {Promise<{result: number, data: any}>} 成功為 {result: 0, data: 對應數據}，失敗為 {result: 1, data: 錯誤訊息}
 */
function waitItemSpawn(bot, data, timeout = 10000) {
    return new Promise(resolve => {
        const listener = async (entity) => {
            try {
                const itemId = JSON.parse(JSON.stringify(entity.metadata[0].value)).itemId;
                if (!itemId) return;
                if (Object.keys(data).includes(itemId.toString())) {
                    finished = true;
                    clearTimeout(timer);
                    bot._client.removeListener('entity_metadata', listener);
                    resolve({
                        result: 0,
                        data: data[itemId]
                    });
                }
            } catch (e) {
                finished = true;
                clearTimeout(timer);
                bot._client.removeListener('entity_metadata', listener);
                resolve({
                    result: 1,
                    data: e.message || 'unknown'
                });
            }
        };
        
        bot._client.on('entity_metadata', listener);

        const timer = setTimeout(() => {
            bot._client.removeListener('entity_metadata', listener);
            resolve({
                result: 1,
                data: 'timeout'
            });
        }, timeout);
    });
}

module.exports = {
    activateBlock,
    waitItemSpawn
};