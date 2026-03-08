const { Database } = require('bun:sqlite');
const db = new Database('./data/database.db');

db.run('PRAGMA foreign_keys = ON;');
const schema = `
CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    prefix TEXT,
    daily TEXT DEFAULT '{}',
    bonusodds REAL DEFAULT 0,
    isAdmin INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    playeruuid TEXT PRIMARY KEY,
    playerid TEXT,
    discordid TEXT,
    rankId INTEGER,
    eWallet REAL DEFAULT 0,
    cWallet REAL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rankId) REFERENCES ranks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS signInRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playeruuid TEXT NOT NULL,
    rewardAmount REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS betRecords (
    betuuid TEXT PRIMARY KEY,
    playeruuid TEXT,
    playerid TEXT,
    currency TEXT,
    amount REAL,
    result TEXT,
    odds REAL,
    bonusodds REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playeruuid) REFERENCES users(playeruuid) ON DELETE CASCADE
);
`;

db.run(schema);

db.query(`INSERT OR IGNORE INTO ranks (id, displayName, prefix, daily, bonusodds, isAdmin) VALUES (1, '未綁定', '', '{"e":0, "c":0}', 0, 0)`).run();

module.exports = db;