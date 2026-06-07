import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/customers — Fetch all customers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
    res.json(customers);
  } catch (error) {
    console.error('[CustomerRoutes] Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/search — Search customers by name or phone
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    if (!q.trim()) {
      res.json([]);
      return;
    }
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });
    res.json(customers);
  } catch (error) {
    console.error('[CustomerRoutes] Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

export default router;