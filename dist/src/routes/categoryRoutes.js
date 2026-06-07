"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// GET /api/categories — Fetch all categories
router.get('/', async (_req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            orderBy: { id: 'asc' },
        });
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
exports.default = router;
//# sourceMappingURL=categoryRoutes.js.map