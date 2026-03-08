const db = require('../database/index');

class PlayerStats {
    static get(playeruuid, bot) {
        let stats = db.query(`
            SELECT ps.*, r.displayName as rankName, r.prefix as rankPrefix, r.daily, r.bonusodds
            FROM playerStats ps
            LEFT JOIN ranks r ON ps.rankId = r.id
            WHERE ps.playeruuid = ? AND ps.bot = ?
        `).get(playeruuid, bot);

        if (!stats) {
            db.query(`
                INSERT INTO playerStats (playeruuid, bot, rankId, emerald, coin)
                VALUES (?, ?, 1, 0, 0)
            `).run(playeruuid, bot);

            return this.get(playeruuid, bot);
        }

        return stats;
    }

    static updateWallet(playeruuid, bot, { eChange = 0, cChange = 0 }) {
        return db.query(`
            UPDATE playerStats 
            SET emerald = emerald + ?, coin = coin + ?
            WHERE playeruuid = ? AND bot = ?
        `).run(eChange, cChange, playeruuid, bot);
    }

    static updateRank(playeruuid, bot, rankId) {
        return db.query(`
            UPDATE playerStats SET rankId = ? WHERE playeruuid = ? AND bot = ?
        `).run(rankId, playeruuid, bot);
    }
}

module.exports = PlayerStats;