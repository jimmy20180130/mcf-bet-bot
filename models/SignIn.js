const db = require('../database/index');

class signIn {
    static hasCheckedInToday(playerid) {
        const result = db.query(`
            SELECT id FROM signInRecords 
            WHERE playerid = ? AND date(createdAt) = date('now', 'localtime')
        `).get(playerid);
        return !!result;
    }

    static record(playerid, reward) {
        const stmt = db.query(`
            INSERT INTO signInRecords (playerid, rewardAmount)
            VALUES (?, ?)
        `);
        return stmt.run(playerid, reward);
    }

    static getCount(playerid) {
        return db.query('SELECT COUNT(*) as total FROM signInRecords WHERE playerid = ?').get(playerid).total;
    }
}

module.exports = signIn;