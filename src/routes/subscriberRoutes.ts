import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/subscribers — Fetch all subscribers (sorted by newest first)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
    res.json(subscribers);
  } catch (error) {
    console.error('[Subscriber API GET Error]:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// POST /api/subscribers — Subscribe an email
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const trimmed = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({ where: { email: trimmed } });
    if (existing) {
      res.json({ message: 'You are already subscribed!' });
      return;
    }

    await prisma.subscriber.create({ data: { email: trimmed } });
    res.status(201).json({ message: 'Successfully subscribed! Welcome to Ever Fit.' });
  } catch (error) {
    console.error('[Subscriber API POST Error]:', error);
    res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
});

export default router;