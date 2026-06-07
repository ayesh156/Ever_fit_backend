import { Router, Request, Response } from 'express';
import path from 'path';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { deleteLocalFile, ensureUploadDir } from '../utils/fileHandler';

const router = Router();

// Multer — files arrive under the field name 'imageFiles'
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureUploadDir('products')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

/**
 * Build the final ordered image list from a request:
 *  - 'imageFiles' multipart uploads  → stored as /uploads/products/<filename>
 *  - 'imageUrls'  JSON string field   → web URLs or existing server paths
 * Order: existing URLs first (preserving their original order), then new uploads appended.
 */
function collectImages(req: Request): { imageUrl: string; order: number }[] {
  const result: { imageUrl: string; order: number }[] = [];
  const seen = new Set<string>();

  // 1. Existing / web URLs sent from the frontend
  if (req.body.imageUrls) {
    try {
      const urls: unknown = typeof req.body.imageUrls === 'string'
        ? JSON.parse(req.body.imageUrls)
        : req.body.imageUrls;
      if (Array.isArray(urls)) {
        for (const u of urls) {
          if (typeof u === 'string' && u.trim() && !seen.has(u)) {
            seen.add(u);
            result.push({ imageUrl: u, order: result.length });
          }
        }
      }
    } catch { /* malformed JSON — skip */ }
  }

  // 2. Newly uploaded file blobs
  const files = req.files as Express.Multer.File[] | undefined;
  if (files) {
    for (const f of files) {
      const url = '/uploads/products/' + f.filename;
      if (!seen.has(url)) {
        seen.add(url);
        result.push({ imageUrl: url, order: result.length });
      }
    }
  }

  // Re-assign order by final position
  result.forEach((r, i) => { r.order = i; });
  return result;
}

// ─── GET /api/products ──────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, variants: true, reviews: true, images: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ─── GET /api/products/:id ──────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid product ID' }); return; }
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true, reviews: true, images: { orderBy: { order: 'asc' } } },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ─── POST /api/products ─────────────────────────────────────────────────────
router.post('/', upload.array('imageFiles', 20), async (req: Request, res: Response) => {
  try {
    const { name, description, price, categoryId, variants, reviews } = req.body;
    if (!name || price === undefined || !categoryId) {
      res.status(400).json({ error: 'Name, price, and categoryId are required' });
      return;
    }
    const incomingImages = collectImages(req);

    let parsedVariants: any[] = [];
    try { parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : (variants ?? []); } catch { parsedVariants = []; }
    let parsedReviews: any[] = [];
    try { parsedReviews = typeof reviews === 'string' ? JSON.parse(reviews) : (reviews ?? []); } catch { parsedReviews = []; }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        categoryId: Number(categoryId),
        variants: parsedVariants.length > 0
          ? { create: parsedVariants.map((v: any) => ({ size: v.size, color: v.color, sku: v.sku, stock: v.stock ?? 0 })) }
          : undefined,
        reviews: parsedReviews.length > 0
          ? { create: parsedReviews.map((r: any) => ({ reviewerName: r.reviewerName, reviewerPhoto: r.reviewerPhoto || null, description: r.description || null, rating: r.rating ?? 5 })) }
          : undefined,
        images: incomingImages.length > 0
          ? { create: incomingImages }
          : undefined,
      },
      include: { category: true, variants: true, reviews: true, images: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('[Product POST Error]:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create product' });
  }
});

// ─── PUT /api/products/:id ──────────────────────────────────────────────────
router.put('/:id', upload.array('imageFiles', 20), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

    const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }

    const { name, description, price, categoryId, variants, reviews } = req.body;

    // Scalar fields
    const updateData: Record<string, unknown> = {};
    if (name       !== undefined) updateData.name        = name;
    if (description !== undefined) updateData.description = description || null;
    if (price      !== undefined) updateData.price       = Number(price);
    if (categoryId !== undefined) updateData.categoryId  = Number(categoryId);

    // ── Image rebuild ──────────────────────────────────────────────────────
    // Always rebuild when the frontend sends 'imageUrls' (even if empty array),
    // because that signals "this is the new authoritative image list".
    const hasImageUpdate = req.body.imageUrls !== undefined || (req.files && (req.files as Express.Multer.File[]).length > 0);

    if (hasImageUpdate) {
      const incomingImages = collectImages(req);

      // Delete old local files that are no longer in the new list
      const incomingSet = new Set(incomingImages.map(i => i.imageUrl));
      for (const img of existing.images) {
        const url = img.imageUrl;
        if (url && !incomingSet.has(url) && !url.startsWith('http')) {
          deleteLocalFile(url);
        }
      }

      // Replace all ProductImage records atomically
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (incomingImages.length > 0) {
        await prisma.productImage.createMany({
          data: incomingImages.map(img => ({ productId: id, imageUrl: img.imageUrl, order: img.order })),
        });
      }
    }

    // ── Scalar update ──────────────────────────────────────────────────────
    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({ where: { id }, data: updateData });
    }

    // ── Variants ───────────────────────────────────────────────────────────
    if (variants !== undefined) {
      let parsedVariants: any[] = [];
      try { parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants; } catch {}
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      for (const v of parsedVariants) {
        await prisma.productVariant.create({
          data: { productId: id, size: v.size, color: v.color, sku: v.sku, stock: v.stock ?? 0 },
        });
      }
    }

    // ── Reviews ────────────────────────────────────────────────────────────
    if (reviews !== undefined) {
      let parsedReviews: any[] = [];
      try { parsedReviews = typeof reviews === 'string' ? JSON.parse(reviews) : reviews; } catch {}
      await prisma.review.deleteMany({ where: { productId: id } });
      for (const r of parsedReviews) {
        await prisma.review.create({
          data: { productId: id, reviewerName: r.reviewerName || 'Anonymous', reviewerPhoto: r.reviewerPhoto || null, description: r.description || null, rating: r.rating ?? 5 },
        });
      }
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true, reviews: true, images: { orderBy: { order: 'asc' } } },
    });
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ─── DELETE /api/products/:productId/images/:imageId ───────────────────────
router.delete('/:productId/images/:imageId', async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const imageId   = Number(req.params.imageId);
    if (isNaN(productId) || isNaN(imageId)) { res.status(400).json({ error: 'Invalid IDs' }); return; }

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) { res.status(404).json({ error: 'Image not found' }); return; }

    if (image.imageUrl && !image.imageUrl.startsWith('http')) deleteLocalFile(image.imageUrl);
    await prisma.productImage.delete({ where: { id: imageId } });

    // Re-normalise display order for remaining images
    const remaining = await prisma.productImage.findMany({ where: { productId }, orderBy: { order: 'asc' } });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await prisma.productImage.update({ where: { id: remaining[i].id }, data: { order: i } });
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ─── DELETE /api/products/:id ───────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid product ID' }); return; }

    const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }

    for (const img of existing.images) {
      if (img.imageUrl && !img.imageUrl.startsWith('http')) deleteLocalFile(img.imageUrl);
    }
    // Cascade deletes handle variants, reviews, images
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;