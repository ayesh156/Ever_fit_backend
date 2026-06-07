"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// GET /api/settings — Fetch all storefront settings
router.get('/', async (_req, res) => {
    try {
        const settings = await prisma_1.prisma.storefrontSetting.findMany();
        const obj = {};
        for (const s of settings) {
            obj[s.key] = s.value;
        }
        res.json(obj);
    }
    catch (error) {
        console.error('[Settings API GET Error]:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// PUT /api/settings — Upsert an array of { key, value } pairs
router.put('/', async (req, res) => {
    try {
        const entries = req.body;
        if (!Array.isArray(entries)) {
            res.status(400).json({ error: 'Body must be an array of { key, value } objects' });
            return;
        }
        for (const entry of entries) {
            if (!entry.key || typeof entry.key !== 'string') {
                res.status(400).json({ error: 'Each entry must have a valid string "key"' });
                return;
            }
            await prisma_1.prisma.storefrontSetting.upsert({
                where: { key: entry.key },
                create: { key: entry.key, value: entry.value ?? '' },
                update: { value: entry.value ?? '' },
            });
        }
        // Return updated settings
        const settings = await prisma_1.prisma.storefrontSetting.findMany();
        const obj = {};
        for (const s of settings) {
            obj[s.key] = s.value;
        }
        res.json(obj);
    }
    catch (error) {
        console.error('[Settings API PUT Error]:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map