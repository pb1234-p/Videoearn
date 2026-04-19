import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'beatd5513@gmail.com';

const db = new Database('earn_inr.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    balance REAL DEFAULT 0,
    total_earned REAL DEFAULT 0,
    upi_id TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    reward_amount REAL NOT NULL,
    duration INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS watched_videos (
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    watched_at TEXT NOT NULL,
    reward_earned REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(video_id) REFERENCES videos(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    amount REAL NOT NULL,
    upi_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Auth Routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      const role = email === ADMIN_EMAIL ? 'admin' : 'user';
      const user = {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        display_name: displayName || 'User',
        role,
        balance: 0,
        total_earned: 0,
        created_at: now,
        updated_at: now
      };

      const stmt = db.prepare('INSERT INTO users (id, email, password, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(user.id, user.email, user.password, user.display_name, user.role, user.created_at, user.updated_at);

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, balance: 0, totalEarned: 0 } });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, balance: user.balance, totalEarned: user.total_earned, upiId: user.upi_id } });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/signout', (req, res) => {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ message: 'Signed out successfully' });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, email, display_name, balance, total_earned, role, upi_id FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, balance: user.balance, totalEarned: user.total_earned, upiId: user.upi_id } });
  });

  // User Routes
  app.patch('/api/user/profile', authenticateToken, (req: any, res) => {
    const { displayName, upiId } = req.body;
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET display_name = ?, upi_id = ?, updated_at = ? WHERE id = ?').run(displayName, upiId, now, req.user.id);
    res.json({ message: 'Profile updated' });
  });

  // Video Routes
  app.get('/api/videos', (req, res) => {
    const videos = db.prepare(`
      SELECT 
        id, 
        title, 
        description, 
        youtube_url AS youtubeUrl, 
        reward_amount AS rewardAmount, 
        duration, 
        active, 
        created_at AS createdAt 
      FROM videos 
      WHERE active = 1 
      ORDER BY created_at DESC
    `).all();
    res.json({ videos });
  });

  app.get('/api/videos/:id', (req, res) => {
    const video = db.prepare(`
      SELECT 
        id, 
        title, 
        description, 
        youtube_url AS youtubeUrl, 
        reward_amount AS rewardAmount, 
        duration, 
        active, 
        created_at AS createdAt 
      FROM videos 
      WHERE id = ? AND active = 1
    `).get(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found or inactive' });
    res.json({ video });
  });

  app.post('/api/videos', authenticateToken, isAdmin, (req, res) => {
    const { title, description, youtubeUrl, rewardAmount, duration } = req.body;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    db.prepare('INSERT INTO videos (id, title, description, youtube_url, reward_amount, duration, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, title, description, youtubeUrl, parseFloat(rewardAmount), parseInt(duration), 1, now
    );
    
    res.json({ 
      video: { 
        id, 
        title, 
        description, 
        youtubeUrl, 
        rewardAmount: parseFloat(rewardAmount), 
        duration: parseInt(duration), 
        active: 1, 
        createdAt: now 
      } 
    });
  });

  // Watch History Routes
  app.get('/api/watched', authenticateToken, (req: any, res) => {
    const history = db.prepare(`
      SELECT 
        w.user_id AS userId, 
        w.video_id AS videoId, 
        w.watched_at AS watchedAt, 
        w.reward_earned AS rewardEarned,
        v.title AS videoTitle 
      FROM watched_videos w 
      JOIN videos v ON w.video_id = v.id 
      WHERE w.user_id = ? 
      ORDER BY w.watched_at DESC
    `).all(req.user.id);
    res.json({ history });
  });

  app.post('/api/watched', authenticateToken, (req: any, res) => {
    const { videoId, rewardEarned } = req.body;
    const now = new Date().toISOString();
    
    // Check if already watched
    const existing = db.prepare('SELECT * FROM watched_videos WHERE user_id = ? AND video_id = ?').get(req.user.id, videoId);
    if (existing) return res.status(400).json({ error: 'Already watched' });

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO watched_videos (user_id, video_id, watched_at, reward_earned) VALUES (?, ?, ?, ?)').run(
        req.user.id, videoId, now, rewardEarned
      );
      db.prepare('UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? WHERE id = ?').run(
        rewardEarned, rewardEarned, now, req.user.id
      );
    });
    transaction();
    res.json({ message: 'Reward claimed' });
  });

  // Withdrawal Routes
  app.get('/api/withdrawals', authenticateToken, (req: any, res) => {
    let withdrawals;
    const sql = `
      SELECT 
        id, 
        user_id AS userId, 
        user_email AS userEmail, 
        amount, 
        upi_id AS upiId, 
        status, 
        created_at AS createdAt, 
        updated_at AS updatedAt 
      FROM withdrawals 
    `;
    
    if (req.user.role === 'admin') {
      withdrawals = db.prepare(sql + ' ORDER BY created_at DESC').all();
    } else {
      withdrawals = db.prepare(sql + ' WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    }
    res.json({ withdrawals });
  });

  app.post('/api/withdrawals', authenticateToken, (req: any, res) => {
    const { amount, upiId } = req.body;
    const user: any = db.prepare('SELECT balance, email FROM users WHERE id = ?').get(req.user.id);

    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const now = new Date().toISOString();
    const requestId = crypto.randomUUID();

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO withdrawals (id, user_id, user_email, amount, upi_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        requestId, req.user.id, user.email, amount, upiId, 'pending', now, now
      );
      db.prepare('UPDATE users SET balance = balance - ?, updated_at = ? WHERE id = ?').run(amount, now, req.user.id);
    });
    transaction();
    res.json({ message: 'Withdrawal requested' });
  });

  app.patch('/api/withdrawals/:id', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    const now = new Date().toISOString();
    
    if (status === 'rejected') {
      const transaction = db.transaction(() => {
        const withdrawal: any = db.prepare('SELECT user_id, amount FROM withdrawals WHERE id = ?').get(req.params.id);
        db.prepare('UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?').run(withdrawal.amount, now, withdrawal.user_id);
        db.prepare('UPDATE withdrawals SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
      });
      transaction();
    } else {
      db.prepare('UPDATE withdrawals SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
    }
    res.json({ message: `Withdrawal ${status}` });
  });

  // Admin Routes
  app.get('/api/admin/videos', authenticateToken, isAdmin, (req, res) => {
    const videos = db.prepare(`
      SELECT 
        id, 
        title, 
        description, 
        youtube_url AS youtubeUrl, 
        reward_amount AS rewardAmount, 
        duration, 
        active, 
        created_at AS createdAt 
      FROM videos 
      ORDER BY created_at DESC
    `).all();
    res.json({ videos });
  });

  app.delete('/api/admin/videos/:id', authenticateToken, isAdmin, (req, res) => {
    db.prepare('UPDATE videos SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Video deactivated' });
  });

  app.delete('/api/admin/videos/:id/permanent', authenticateToken, isAdmin, (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM watched_videos WHERE video_id = ?').run(req.params.id);
      db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ message: 'Video permanently deleted' });
  });

  app.patch('/api/admin/videos/:id/restore', authenticateToken, isAdmin, (req, res) => {
    db.prepare('UPDATE videos SET active = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Video restored' });
  });

  app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    const users = db.prepare(`
      SELECT 
        id, 
        email, 
        display_name AS displayName, 
        balance, 
        total_earned AS totalEarned, 
        role, 
        created_at AS createdAt 
      FROM users
    `).all();
    res.json({ users });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
