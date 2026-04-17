import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists (local storage for images)
export const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    // Migration: Add is_active column if it doesn't exist in existing table
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active') THEN
          ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
    `);

    // 2. Locations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        status TEXT,
        isCompleted BOOLEAN DEFAULT FALSE
      )
    `);

    // 3. Master Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        standardQty INTEGER,
        satuan TEXT
      )
    `);

    // 4. Checklists Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id TEXT PRIMARY KEY,
        locationId TEXT REFERENCES locations(id),
        itemId TEXT REFERENCES master_items(id),
        jumlahAktual INTEGER,
        kondisi TEXT,
        dokumentasi TEXT,
        catatan TEXT
      )
    `);

    // 5. Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username TEXT,
        action TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure we have an administrator
    const adminHash = bcrypt.hashSync('password123', 10);
    // Upgrade existing 'admin' to 'administrator' or create new one
    await client.query(`
      INSERT INTO users (username, password, role, is_active)
      VALUES ('admin', $1, 'administrator', TRUE)
      ON CONFLICT (username) DO UPDATE SET role = 'administrator', is_active = TRUE
    `, [adminHash]);

    // Default Viewer User
    const viewerHash = bcrypt.hashSync('password123', 10);
    await client.query(`
      INSERT INTO users (username, password, role, is_active)
      VALUES ('user', $1, 'viewer', TRUE)
      ON CONFLICT (username) DO NOTHING
    `, [viewerHash]);

    console.log("PostgreSQL Database initialized.");
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
