import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getJwtSecret, verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.active) {
      res.status(401).json({ error: 'Account has been deactivated' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /api/auth/users (admin only - list staff) ────────────────────────
router.get('/users', verifyToken, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    console.error('[Auth] List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── POST /api/auth/users (admin only - create staff) ─────────────────────
router.post('/users', verifyToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required' });
      return;
    }

    if (!['ADMIN', 'CASHIER', 'STAFF'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be ADMIN, CASHIER, or STAFF' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role as any },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('[Auth] Create user error:', error);
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ── PATCH /api/auth/users/:id (admin only - update role/active/password) ─
router.patch('/users/:id', verifyToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid user ID' }); return; }

    const { role, active, password, name } = req.body;
    const data: any = {};
    if (role !== undefined) {
      if (!['ADMIN', 'CASHIER', 'STAFF'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' }); return;
      }
      data.role = role;
    }
    if (active !== undefined) data.active = Boolean(active);
    if (name !== undefined && name.trim()) data.name = name.trim();
    // Only hash and update password if a non-empty string is provided
    if (password !== undefined && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password, 12);
      data.password = hashedPassword;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error('[Auth] Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;