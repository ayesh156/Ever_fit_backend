"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// GET /api/products — Fetch all products with categories and variants
router.get('/', async (_req, res) => {
    try {
        const products = await prisma_1.prisma.product.findMany({
            include: {
                category: true,
                variants: true,
                reviews: true,
                images: { orderBy: { order: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// GET /api/products/:id — Fetch a single product
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid product ID' });
            return;
        }
        const product = await prisma_1.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                variants: true,
                reviews: true,
                images: { orderBy: { order: 'asc' } },
            },
        });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// POST /api/products — Create a new product with variants
router.post('/', async (req, res) => {
    try {
        const { name, description, price, image, images, categoryId, variants, reviews } = req.body;
        if (!name || price === undefined || !categoryId) {
            res.status(400).json({ error: 'Name, price, and categoryId are required' });
            return;
        }
        const product = await prisma_1.prisma.product.create({
            data: {
                name,
                description: description || null,
                price: Number(price),
                image: image || null,
                categoryId: Number(categoryId),
                variants: variants
                    ? {
                        create: variants.map((v) => ({
                            size: v.size,
                            color: v.color,
                            sku: v.sku,
                            stock: v.stock ?? 0,
                        })),
                    }
                    : undefined,
                reviews: reviews
                    ? {
                        create: reviews.map((r) => ({
                            reviewerName: r.reviewerName,
                            reviewerPhoto: r.reviewerPhoto || null,
                            description: r.description || null,
                            rating: r.rating ?? 5,
                        })),
                    }
                    : undefined,
                images: images
                    ? {
                        create: images.map((img, idx) => ({
                            imageData: img,
                            order: idx,
                        })),
                    }
                    : undefined,
            },
            include: {
                category: true,
                variants: true,
                reviews: true,
                images: true,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('[Product API POST Error]:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create product',
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        });
    }
});
// PUT /api/products/:id — Update a product and its variants
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid product ID' });
            return;
        }
        const { name, description, price, image, images, categoryId, variants, reviews } = req.body;
        // Update the product details
        await prisma_1.prisma.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: Number(price) }),
                ...(image !== undefined && { image }),
                ...(categoryId !== undefined && { categoryId: Number(categoryId) }),
            },
        });
        // If variants are provided, replace them
        if (variants) {
            await prisma_1.prisma.productVariant.deleteMany({ where: { productId: id } });
            for (const v of variants) {
                await prisma_1.prisma.productVariant.create({
                    data: {
                        productId: id,
                        size: v.size,
                        color: v.color,
                        sku: v.sku,
                        stock: v.stock ?? 0,
                    },
                });
            }
        }
        // If reviews are provided, replace them
        if (reviews) {
            await prisma_1.prisma.review.deleteMany({ where: { productId: id } });
            for (const r of reviews) {
                await prisma_1.prisma.review.create({
                    data: {
                        productId: id,
                        reviewerName: r.reviewerName || 'Anonymous',
                        reviewerPhoto: r.reviewerPhoto || null,
                        description: r.description || null,
                        rating: r.rating ?? 5,
                    },
                });
            }
        }
        // If images are provided, replace them
        if (images) {
            await prisma_1.prisma.productImage.deleteMany({ where: { productId: id } });
            for (const [idx, img] of images.entries()) {
                await prisma_1.prisma.productImage.create({
                    data: {
                        productId: id,
                        imageData: img,
                        order: idx,
                    },
                });
            }
        }
        const updatedProduct = await prisma_1.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                variants: true,
                reviews: true,
                images: { orderBy: { order: 'asc' } },
            },
        });
        res.json(updatedProduct);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/products/:id — Delete a product
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid product ID' });
            return;
        }
        const existing = await prisma_1.prisma.product.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        await prisma_1.prisma.productVariant.deleteMany({ where: { productId: id } });
        await prisma_1.prisma.product.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
//# sourceMappingURL=productRoutes.js.map