const db = require('../database/index');

class User {
    static getByUuid(uuid) {
        return db.query(`
            SELECT u.*, r.displayName as rankName, r.prefix as rankPrefix 
            FROM users u 
            LEFT JOIN ranks r ON u.rankId = r.id 
            WHERE u.playeruuid = ?
        `).get(uuid);
    }

    static getByPlayerId(playerid) {
        return db.query(`
            SELECT u.*, r.displayName as rankName, r.prefix as rankPrefix
            FROM users u
            LEFT JOIN ranks r ON u.rankId = r.id
            WHERE u.playerid = ?
        `).get(playerid);
    }

    static getRankSettings(playerData) {
        playerData = playerData.replace(/§./g, '');
        let row;
        if (playerData.length == 32) {
            row = db.prepare(`
                SELECT 
                    u.playeruuid, 
                    r.displayName, 
                    r.bonusodds, 
                    r.daily,
                    r.isAdmin
                FROM users u
                JOIN ranks r ON u.rankId = r.id
                WHERE u.playeruuid = ?
            `).get(playerData);
        } else {
            row = db.prepare(`
                SELECT
                    u.playerid,
                    r.displayName,
                    r.bonusodds,
                    r.daily,
                    r.isAdmin
                FROM users u
                JOIN ranks r ON u.rankId = r.id
                WHERE u.playerid = ?
            `).get(playerData);
        }

        if (!row) return null;

        return {
            ...row,
            displayName: row.displayName,
            bonusodds: row.bonusodds || 0,
            daily: JSON.parse(row.daily)
        };
    }

    static create({ playeruuid, playerid, discordid = null, rankId = 1, eWallet = 0, cWallet = 0 }) {
        const stmt = db.query(`
            INSERT OR IGNORE INTO users (playeruuid, playerid, discordid, rankId, eWallet, cWallet)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(playeruuid, playerid, discordid, rankId, eWallet, cWallet);
    }

    static updateWallet(playerId, { eChange = 0, cChange = 0 }) {
        const stmt = db.query(`
            UPDATE users SET eWallet = eWallet + ?, cWallet = cWallet + ?
            WHERE playerid = ?
        `);
        return stmt.run(eChange, cChange, playerId);
    }
}

module.exports = User;