import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'billscan.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name TEXT,
    broker_name TEXT,
    merchant_name TEXT,
    bill_number TEXT,
    bill_date TEXT,
    total_size TEXT,
    total_weight TEXT,
    total_amount REAL,
    confidence_notes TEXT,
    image_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OK',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_name TEXT,
    bags TEXT,
    weight TEXT,
    unit_price REAL,
    line_price REAL,
    location TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
  );
`);

export default db;
