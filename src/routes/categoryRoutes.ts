import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/categories — Fetch all categories with product counts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id — Fetch a single category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories — Create a new category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, image, status } = req.body;

    if (!name || !slug) {
      res.status(400).json({ error: 'Name and slug are required' });
      return;
    }

    // Check for duplicate slug
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ error: `Slug "${slug}" already exists` });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        status: status || 'active',
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id — Update a category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { name, slug, description, image, status } = req.body;

    // If slug is being changed, check for duplicates
    if (slug && slug !== existing.slug) {
      const duplicate = await prisma.category.findUnique({ where: { slug } });
      if (duplicate) {
        res.status(409).json({ error: `Slug "${slug}" already exists` });
        return;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(status !== undefined && { status }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id — Delete a category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Find the first active category to reassign orphaned products
    const fallbackCategory = await prisma.category.findFirst({
      where: { status: 'active', id: { not: id } },
      orderBy: { id: 'asc' },
    });

    if (fallbackCategory) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: fallbackCategory.id },
      });
    } else {
      // No fallback category exists — delete products tied to this category first
      await prisma.productVariant.deleteMany({
        where: { product: { categoryId: id } },
      });
      await prisma.review.deleteMany({
        where: { product: { categoryId: id } },
      });
      await prisma.productImage.deleteMany({
        where: { product: { categoryId: id } },
      });
      await prisma.product.deleteMany({
        where: { categoryId: id },
      });
    }

    await prisma.category.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;