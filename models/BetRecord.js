const db = require('../database/index');
const { randomUUID } = require('crypto');

class BetRecord {
    // odds: 當下的基礎 id
    // bonusodds: 玩家當下的加成 id
    static create({ playeruuid, bot, playerid = null, currency, amount, result, odds, bonusodds }) {
        const betuuid = randomUUID().replace(/-/g, '');
        const stmt = db.query(`
        INSERT INTO betRecords (betuuid, playeruuid, bot, playerid, currency, amount, result, odds, bonusodds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        return stmt.run(betuuid, playeruuid, bot, playerid, currency, amount, result, odds, bonusodds);
    }

    static getStats(filters) {
        let sql = `
            SELECT 
                COUNT(*) as totalBets,
                SUM(amount) as totalBetAmount,
                SUM(CASE WHEN result > 0 THEN result ELSE 0 END) as winAmount
            FROM betRecords 
            WHERE 1=1
        `;
        const params = [];

        if (filters.playeruuid) {
            sql += ` AND playeruuid = ?`;
            params.push(filters.playeruuid);
        }
        if (filters.bot) {
            sql += ` AND bot = ?`;
            params.push(filters.bot);
        }
        if (filters.currency) {
            sql += ` AND currency = ?`;
            params.push(filters.currency);
        }
        if (filters.startTime) {
            sql += ` AND createdAt >= ?`;
            params.push(filters.startTime);
        }
        if (filters.endTime) {
            sql += ` AND createdAt <= ?`;
            params.push(filters.endTime);
        }
        if (filters.minAmount) {
            sql += ` AND amount >= ?`;
            params.push(filters.minAmount);
        }
        if (filters.maxAmount) {
            sql += ` AND amount <= ?`;
            params.push(filters.maxAmount);
        }

        return db.query(sql).get(...params);
    }
}

module.exports = BetRecord;