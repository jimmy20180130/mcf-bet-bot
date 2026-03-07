const db = require('../database/index');

class User {
    static getByUuid(uuid) {
        return db.prepare(`
            SELECT u.*, r.displayName as rankName, r.prefix as rankPrefix 
            FROM users u 
            LEFT JOIN ranks r ON u.rankId = r.id 
            WHERE u.playeruuid = ?
        `).get(uuid);
    }

    static getByPlayerId(playerid) {
        return db.prepare(`
            SELECT u.*, r.displayName as rankName, r.prefix as rankPrefix
            FROM users u
            LEFT JOIN ranks r ON u.rankId = r.id
            WHERE u.playerid = ?
        `).get(playerid);
    }

    static create({ playeruuid, playerid, discordid = null, rankId = 1, eWallet = 0, cWallet = 0 }) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO users (playeruuid, playerid, discordid, rankId, eWallet, cWallet)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(playeruuid, playerid, discordid, rankId, eWallet, cWallet);
    }

    static updateWallet(uuid, { eChange = 0, cChange = 0 }) {
        const stmt = db.prepare(`
            UPDATE users SET eWallet = eWallet + ?, cWallet = cWallet + ?
            WHERE playeruuid = ?
        `);
        return stmt.run(eChange, cChange, uuid);
    }
}

module.exports = User;