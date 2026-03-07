const db = require('../database/index');
const { v4: uuidv4 } = require('uuid');

class BetRecord {
    // odds: 當下的基礎 id
    // bonusodds: 玩家當下的加成 id
    static create({ playeruuid, playerid = null, currency, amount, result, odds, bonusodds }) {
        const betuuid = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO betRecords (betuuid, playeruuid, playerid, currency, amount, result, odds, bonusodds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(betuuid, playeruuid, playerid, currency, amount, result, odds, bonusodds);
    }

    static getPlayerHistory(uuid, limit = 10) {
        return db.prepare(`
            SELECT * FROM betRecords WHERE playeruuid = ? 
            ORDER BY createdAt DESC LIMIT ?
        `).all(uuid, limit);
    }
}

module.exports = BetRecord;