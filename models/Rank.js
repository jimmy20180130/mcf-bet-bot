const db = require('../database/index');

class Rank {
    static create({ displayName, prefix, daily = {}, bonusodds = {}, isAdmin = 0 }) {
        const stmt = db.query(`
            INSERT INTO ranks (displayName, prefix, daily, bonusodds, isAdmin)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(displayName, prefix, JSON.stringify(daily), JSON.stringify(bonusodds), isAdmin);
    }

    static getById(id) {
        const rank = db.query('SELECT * FROM ranks WHERE id = ?').get(id);
        if (rank) {
            rank.daily = JSON.parse(rank.daily);
            rank.bonusodds = JSON.parse(rank.bonusodds);
        }
        return rank;
    }

    static getAll() {
        return db.query('SELECT * FROM ranks').all().map(r => ({
            ...r,
            daily: JSON.parse(r.daily),
            bonusodds: JSON.parse(r.bonusodds)
        }));
    }
}

module.exports = Rank;