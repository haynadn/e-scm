import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db, { initDB, uploadsDir } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'amar-super-secret-key-123';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve React static files from 'dist' in production
const distDir = join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if(!authHeader) return res.status(401).json({ error: 'Null token' });
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if(err) return res.status(403).json({ error: 'Token invalid' });
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang diperbolehkan.' });
  }
};

// Start Server & DB
initDB().then(() => {
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
      const row = result.rows[0];
      
      if(!row) return res.status(400).json({ error: 'Invalid username' });

      const isValid = bcrypt.compareSync(password, row.password);
      if(!isValid) return res.status(400).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: row.id, username: row.username, role: row.role }, JWT_SECRET);
      res.json({ token, role: row.role, username: row.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Pull all synchronized app data
  app.get('/api/data', authenticateToken, async (req, res) => {
    const response = {
      locations: [],
      masterItems: [],
      checklists: {}
    };

    try {
      const locsRes = await db.query(`SELECT * FROM locations`);
      const itemsRes = await db.query(`SELECT * FROM master_items`);
      const chksRes = await db.query(`SELECT * FROM checklists`);

      response.locations = locsRes.rows.map(l => ({ ...l, isCompleted: !!l.iscompleted }));
      response.masterItems = itemsRes.rows.map(item => ({
        id: item.id,
        name: item.name,
        standardQty: item.standardqty,
        satuan: item.satuan
      }));
      
      chksRes.rows.forEach(chk => {
        const locationId = chk.locationid;
        if(!response.checklists[locationId]) {
          response.checklists[locationId] = [];
        }
        response.checklists[locationId].push({
          idItem: chk.itemid,
          jumlahAktual: chk.jumlahaktual,
          kondisi: chk.kondisi,
          dokumentasi: chk.dokumentasi,
          catatan: chk.catatan
        });
      });

      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/import', authenticateToken, authorizeAdmin, async (req, res) => {
    const { locations, masterItems } = req.body;
    const client = await db.connect();
    
    try {
      await client.query("BEGIN");
      
      if(locations && locations.length > 0) {
        await client.query('DELETE FROM locations');
        for (const loc of locations) {
          await client.query(
            'INSERT INTO locations (id, name, address, status, isCompleted) VALUES ($1, $2, $3, $4, $5)',
            [loc.id, loc.name, loc.address, loc.status, false]
          );
        }
      }

      if(masterItems && masterItems.length > 0) {
        await client.query('DELETE FROM master_items');
        for (const item of masterItems) {
          await client.query(
            'INSERT INTO master_items (id, name, standardQty, satuan) VALUES ($1, $2, $3, $4)',
            [item.id, item.name, item.standardQty, item.satuan]
          );
        }
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Master Data imported successfully to Remote DB." });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post('/api/locations/:id/checklist', authenticateToken, async (req, res) => {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Akses ditolak. Anda sedang dalam mode Lihat Saja.' });
    }
    const locationId = req.params.id;
    const itemsData = req.body.items; 
    const isCompleted = req.body.isCompleted || false;
    const address = req.body.address || '';
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      
      // Update location status and address dynamically
      await client.query(`UPDATE locations SET isCompleted = $1, address = $2 WHERE id = $3`, [isCompleted, address, locationId]);
      
      // Clear existing records for this location
      await client.query(`DELETE FROM checklists WHERE locationId = $1`, [locationId]);

      for (const item of itemsData) {
        let finalDokumentasi = item.dokumentasi;

        if(item.dokumentasi && item.dokumentasi.startsWith('data:image')) {
          const matches = item.dokumentasi.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `LOC_${locationId}_ITEM_${item.idItem}_${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(uploadsDir, filename), buffer);
            finalDokumentasi = `//${req.get('host')}/uploads/${filename}`;
          }
        }

        const id = `${locationId}_${item.idItem}`;
        
        // Let it be NULL if empty to preserve accurate unchecked state
        const parsedJumlahAktual = (item.jumlahAktual !== '' && item.jumlahAktual !== null && item.jumlahAktual !== undefined) 
                                      ? parseInt(item.jumlahAktual) 
                                      : null;

        await client.query(
          `INSERT INTO checklists (id, locationId, itemId, jumlahAktual, kondisi, dokumentasi, catatan) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id, 
            locationId, 
            item.idItem, 
            parsedJumlahAktual, 
            item.kondisi, 
            finalDokumentasi, 
            item.catatan
          ]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.put('/api/locations/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const locationId = req.params.id;
    const { name } = req.body;
    try {
      await db.query(`UPDATE locations SET name = $1 WHERE id = $2`, [name, locationId]);
      res.json({ success: true, message: 'Location name updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profile/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
      const result = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      const user = result.rows[0];

      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = bcrypt.compareSync(oldPassword, user.password);
      if (!isValid) return res.status(400).json({ error: 'Password lama tidak sesuai' });

      const newHash = bcrypt.hashSync(newPassword, 10);
      await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [newHash, userId]);

      res.json({ success: true, message: 'Password berhasil diubah' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
      const result = await db.query(`SELECT id, username, role FROM users ORDER BY id DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    try {
      const hash = bcrypt.hashSync(password, 10);
      await db.query(`INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`, [username, hash, role]);
      res.json({ success: true, message: 'User berhasil ditambahkan' });
    } catch (err) {
      if (err.code === '23505') { // Postgres unique_violation
        return res.status(400).json({ error: 'Username sudah digunakan' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/clear', authenticateToken, authorizeAdmin, async (req, res) => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM checklists');
      await client.query('DELETE FROM locations');
      await client.query('DELETE FROM master_items');
      await client.query("COMMIT");
      res.json({ success: true, message: "Wiped effectively" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Health check endpoint for CI/CD
  app.get('/api/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
    }
  });

  // Fallback for React Single Page Application (SPA) routing
  app.get(/.*/, (req, res) => {
    if (fs.existsSync(distDir)) {
      res.sendFile(join(distDir, 'index.html'));
    } else {
      res.send("API Server is running. Please run 'npm run build' to generate frontend files.");
    }
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server due to DB initialization error:", err);
});
