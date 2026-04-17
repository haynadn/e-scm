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

const authorizeAdministrator = (req, res, next) => {
  if (req.user && req.user.role === 'administrator') {
    next();
  } else {
    res.status(403).json({ error: 'Akses ditolak. Tingkat Administrator diperlukan.' });
  }
};

const authorizeEditor = (req, res, next) => {
  if (req.user && (req.user.role === 'surveyor' || req.user.role === 'administrator' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Akses ditolak. Tingkat Surveyor atau Administrator diperlukan.' });
  }
};

const logActivity = async (userId, username, action, details) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, username, action, details) VALUES ($1, $2, $3, $4)',
      [userId, username, action, details]
    );
  } catch (err) {
    console.error('Logging Error:', err);
  }
};

// Start Server & DB
initDB().then(() => {
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
      const row = result.rows[0];
      
      if(!row) {
        logActivity(null, username, 'LOGIN_FAILED', 'Username not found');
        return res.status(400).json({ error: 'Invalid username' });
      }

      const isValid = bcrypt.compareSync(password, row.password);
      if(!isValid) {
        logActivity(row.id, row.username, 'LOGIN_FAILED', 'Invalid password attempt');
        return res.status(400).json({ error: 'Invalid password' });
      }

      if (row.is_active === false) {
        logActivity(row.id, row.username, 'LOGIN_BLOCKED', 'Inactive account attempt');
        return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' });
      }

      logActivity(row.id, row.username, 'LOGIN_SUCCESS', 'User logged in');
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

  app.post('/api/import', authenticateToken, authorizeAdministrator, async (req, res) => {
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
      logActivity(req.user.id, req.user.username, 'IMPORT_DATA', `Imported ${locations?.length || 0} locs, ${masterItems?.length || 0} items`);
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
      logActivity(req.user.id, req.user.username, 'SUBMIT_CHECKLIST', `Location ID: ${locationId}, Items: ${itemsData.length}, Status: ${isCompleted?'Completed':'Draft'}`);
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.put('/api/locations/:id', authenticateToken, authorizeEditor, async (req, res) => {
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

  app.get('/api/users', authenticateToken, authorizeAdministrator, async (req, res) => {
    try {
      const result = await db.query(`SELECT id, username, role, is_active FROM users ORDER BY id DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id/status', authenticateToken, authorizeAdministrator, async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
      await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [is_active, id]);
      logActivity(req.user.id, req.user.username, 'TOGGLE_USER_STATUS', `User ID ${id} set to active=${is_active}`);
      res.json({ success: true, message: 'Status user diperbarui' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', authenticateToken, authorizeAdministrator, async (req, res) => {
    const { id } = req.params;
    try {
      // Prevent self-deletion
      if (req.user.id == id) {
        return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
      }
      await db.query(`DELETE FROM users WHERE id = $1`, [id]);
      logActivity(req.user.id, req.user.username, 'DELETE_USER', `Deleted User ID ${id}`);
      res.json({ success: true, message: 'User berhasil dihapus' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', authenticateToken, authorizeAdministrator, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    try {
      const hash = bcrypt.hashSync(password, 10);
      await db.query(`INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`, [username, hash, role]);
      logActivity(req.user.id, req.user.username, 'CREATE_USER', `Created user: ${username} as ${role}`);
      res.json({ success: true, message: 'User berhasil ditambahkan' });
    } catch (err) {
      if (err.code === '23505') { // Postgres unique_violation
        return res.status(400).json({ error: 'Username sudah digunakan' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/clear', authenticateToken, authorizeAdministrator, async (req, res) => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM checklists');
      await client.query('DELETE FROM locations');
      await client.query('DELETE FROM master_items');
      await client.query("COMMIT");
      logActivity(req.user.id, req.user.username, 'CLEAR_DATABASE', 'Wiped all checklist, location, and master data');
      res.json({ success: true, message: "Wiped effectively" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  // Approval Workflow: Reset Location Data
  app.post('/api/reset-requests', authenticateToken, async (req, res) => {
    const { locationId, locationName } = req.body;
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'View-only users cannot request reset' });

    try {
      // Check if there's already a pending request for this location
      const checkRes = await db.query(
        'SELECT * FROM reset_requests WHERE location_id = $1 AND status = \'pending\'',
        [locationId]
      );
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: 'Permintaan reset untuk lokasi ini masih menunggu persetujuan.' });
      }

      await db.query(
        'INSERT INTO reset_requests (location_id, location_name, requested_by) VALUES ($1, $2, $3)',
        [locationId, locationName, req.user.username]
      );
      logActivity(req.user.id, req.user.username, 'REQUEST_RESET', `Location: ${locationName} (${locationId})`);
      res.json({ success: true, message: 'Permintaan reset telah dikirim ke Administrator.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reset-requests', authenticateToken, authorizeAdministrator, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM reset_requests WHERE status = \'pending\' ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/reset-requests/:id', authenticateToken, authorizeAdministrator, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const reqRes = await client.query('SELECT * FROM reset_requests WHERE id = $1', [id]);
      const resetReq = reqRes.rows[0];

      if (!resetReq) return res.status(404).json({ error: 'Request not found' });

      await client.query('UPDATE reset_requests SET status = $1 WHERE id = $2', [status, id]);

      if (status === 'approved') {
        const locId = resetReq.location_id;
        // Execute the heavy clear logic
        await client.query('DELETE FROM checklists WHERE locationId = $1', [locId]);
        await client.query('UPDATE locations SET isCompleted = FALSE, address = \'\' WHERE id = $1', [locId]);
        logActivity(req.user.id, req.user.username, 'APPROVE_RESET', `Approved reset for ${resetReq.location_name}`);
      } else {
        logActivity(req.user.id, req.user.username, 'REJECT_RESET', `Rejected reset for ${resetReq.location_name}`);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Permintaan reset telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.` });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/api/locations/:id/reset-status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query(
        'SELECT * FROM reset_requests WHERE location_id = $1 ORDER BY created_at DESC LIMIT 1',
        [id]
      );
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.json(null);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/logs', authenticateToken, authorizeEditor, async (req, res) => {
    try {
      let query = `SELECT * FROM activity_logs`;
      let params = [];
      
      if (req.user.role !== 'administrator') {
        query += ` WHERE username = $1`;
        params.push(req.user.username);
      }
      
      query += ` ORDER BY created_at DESC LIMIT 200`;
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
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
