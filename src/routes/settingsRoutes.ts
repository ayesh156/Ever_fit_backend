import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/settings — Fetch all storefront settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.storefrontSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      obj[s.key] = s.value;
    }
    res.json(obj);
  } catch (error) {
    console.error('[Settings API GET Error]:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — Upsert an array of { key, value } pairs
router.put('/', async (req: Request, res: Response) => {
  try {
    const entries: { key: string; value: string }[] = req.body;
    if (!Array.isArray(entries)) {
      res.status(400).json({ error: 'Body must be an array of { key, value } objects' });
      return;
    }

    for (const entry of entries) {
      if (!entry.key || typeof entry.key !== 'string') {
        res.status(400).json({ error: 'Each entry must have a valid string "key"' });
        return;
      }
      await prisma.storefrontSetting.upsert({
        where: { key: entry.key },
        create: { key: entry.key, value: entry.value ?? '' },
        update: { value: entry.value ?? '' },
      });
    }

    // Return updated settings
    const settings = await prisma.storefrontSetting.findMany();
    const obj: Record<string, string> = {};
    for (const s of settings) {
      obj[s.key] = s.value;
    }
    res.json(obj);
  } catch (error) {
    console.error('[Settings API PUT Error]:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;