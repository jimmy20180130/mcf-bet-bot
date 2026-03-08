const db = require('../database/index');

class signIn {
    static hasCheckedInToday(uuid) {
        const result = db.query(`
            SELECT id FROM signInRecords 
            WHERE playeruuid = ? AND date(createdAt) = date('now', 'localtime')
        `).get(uuid);
        return !!result;
    }

    static record(uuid, reward) {
        const stmt = db.query(`
            INSERT INTO signInRecords (playeruuid, rewardAmount)
            VALUES (?, ?)
        `);
        return stmt.run(uuid, reward);
    }

    static getCount(uuid) {
        return db.query('SELECT COUNT(*) as total FROM signInRecords WHERE playeruuid = ?').get(uuid).total;
    }
}

module.exports = signIn;