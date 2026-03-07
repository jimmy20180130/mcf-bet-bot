const db = require('../database/index');

class signIn {
    static hasCheckedInToday(uuid) {
        const result = db.prepare(`
            SELECT id FROM signInRecords 
            WHERE playeruuid = ? AND date(createdAt) = date('now', 'localtime')
        `).get(uuid);
        return !!result;
    }

    static record(uuid, reward) {
        const stmt = db.prepare(`
            INSERT INTO signInRecords (playeruuid, rewardAmount)
            VALUES (?, ?)
        `);
        return stmt.run(uuid, reward);
    }

    static getCount(uuid) {
        return db.prepare('SELECT COUNT(*) as total FROM signInRecords WHERE playeruuid = ?').get(uuid).total;
    }
}

module.exports = signIn;