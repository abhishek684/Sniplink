const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'urlshortener.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      title TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      expires_at DATETIME DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      referrer TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    )
  `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id)`);

    // Payments table for Razorpay
    db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      razorpay_order_id TEXT UNIQUE NOT NULL,
      razorpay_payment_id TEXT DEFAULT NULL,
      razorpay_signature TEXT DEFAULT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'created',
      paid_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`);

    // OTP Codes table for email verification
    db.run(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    saveDatabase();
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Sanitize params for sql.js binding
function sanitizeParams(params) {
    return params.map(p => {
        if (p === null || p === undefined) return null;
        if (typeof p === 'number') return p;
        if (typeof p === 'string') return p;
        if (typeof p === 'boolean') return p ? 1 : 0;
        return String(p);
    });
}

// Helper: run SELECT query and return all rows as array of objects
function queryAll(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
            stmt.bind(sanitizeParams(params));
        }
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    } catch (err) {
        console.error('queryAll error:', err.message, 'SQL:', sql, 'Params:', params);
        throw err;
    }
}

// Helper: run query and return first row as object, or null
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Helper: run INSERT/UPDATE/DELETE using prepare+bind+step and return lastInsertRowid
function runSql(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
            stmt.bind(sanitizeParams(params));
        }
        stmt.step();
        stmt.free();

        // Get last_insert_rowid immediately after the statement
        const idStmt = db.prepare("SELECT last_insert_rowid() as id");
        idStmt.step();
        const row = idStmt.getAsObject();
        idStmt.free();
        const lastId = row.id;

        const changes = db.getRowsModified();
        saveDatabase();
        return { lastInsertRowid: lastId, changes };
    } catch (err) {
        console.error('runSql error:', err.message, 'SQL:', sql, 'Params:', params);
        throw err;
    }
}

module.exports = { initDatabase, queryAll, queryOne, runSql, saveDatabase };
