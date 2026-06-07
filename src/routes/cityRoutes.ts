import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/cities — Fetch all cities
// If the City table doesn't exist yet, return empty array instead of 500
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json(cities);
  } catch (error: any) {
    console.error('[CityRoutes] Error fetching cities:', error?.message || error);
    // If table doesn't exist (P2021 = "Table does not exist"), return empty array
    // so the frontend doesn't break on first run before seeding
    if (error?.code === 'P2021') {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  }
});

export default router;
