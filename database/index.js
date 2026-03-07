const Database = require('better-sqlite3');
const db = new Database('database.db');

db.pragma('foreign_keys = ON');

const schema = `
CREATE TABLE IF NOT EXISTS ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    prefix TEXT,
    daily TEXT DEFAULT '{}',
    bonusodds TEXT DEFAULT '{}',
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

db.exec(schema);

module.exports = db;