import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { deleteOldImage, ensureUploadDir } from '../utils/fileHandler';

const router = Router();

// Setup multer for customer photo uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureUploadDir('customers')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'customer-' + Date.now() + ext);
  },
});
const upload = multer({ storage });

// GET /api/customers — Fetch all customers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        photoUrl: true,
        outstandingBalance: true,
        notes: true,
        nic: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    res.json(customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      photoUrl: c.photoUrl || '',
      outstandingBalance: c.outstandingBalance,
      notes: c.notes || '',
      nic: c.nic || '',
      totalOrders: c._count.orders,
      createdAt: c.createdAt,
    })));
  } catch (error) {
    console.error('[CustomerRoutes] Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/search — Search customers by name or phone
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    if (!q.trim()) { res.json([]); return; }
    const customers = await prisma.customer.findMany({
      where: { OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, phone: true, email: true, _count: { select: { orders: true } } },
    });
    res.json(customers.map(c => ({ id: c.id, name: c.name, phone: c.phone || '', email: c.email || '', totalOrders: c._count.orders })));
  } catch (error) {
    console.error('[CustomerRoutes] Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// PUT /api/customers/:id — Update a customer
router.put('/:id', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid customer ID' }); return; }

    const { name, phone, email, address, city, outstandingBalance, notes, nic } = req.body;
    console.log('[CustomerRoutes] PUT /api/customers/:id — body:', { name, phone, email, address, city, outstandingBalance, notes, nic });
    if (req.file) console.log('[CustomerRoutes] Uploaded file:', req.file.filename);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Customer not found' }); return; }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (outstandingBalance !== undefined) data.outstandingBalance = parseFloat(String(outstandingBalance)) || 0;
    if (notes !== undefined) data.notes = notes;
    if (nic !== undefined) data.nic = nic;

    if (req.file) {
      // Delete old image if it was a local upload
      deleteOldImage(existing.photoUrl);
      data.photoUrl = '/uploads/customers/' + req.file.filename;
    } else if (req.body.photoUrl === '') {
      deleteOldImage(existing.photoUrl);
      data.photoUrl = null;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
      select: {
        id: true, name: true, phone: true, email: true, address: true, city: true,
        photoUrl: true, outstandingBalance: true, notes: true, nic: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    res.json({
      id: updated.id, name: updated.name, phone: updated.phone || '', email: updated.email || '',
      address: updated.address || '', city: updated.city || '', photoUrl: updated.photoUrl || '',
      outstandingBalance: updated.outstandingBalance, notes: updated.notes || '', nic: updated.nic || '',
      totalOrders: updated._count.orders, createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error('[CustomerRoutes] Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// POST /api/customers — Create a new customer
router.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, city, outstandingBalance, notes, nic } = req.body;
    console.log('[CustomerRoutes] POST /api/customers — body:', { name, phone, email, address, city, outstandingBalance, notes, nic });

    if (!name || !name.trim()) { res.status(400).json({ error: 'Name is required' }); return; }

    const photoUrl = req.file ? '/uploads/customers/' + req.file.filename : null;

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || '',
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        photoUrl,
      outstandingBalance: parseFloat(String(outstandingBalance)) || 0,
        notes: notes?.trim() || null,
        nic: nic?.trim() || null,
      },
      select: {
        id: true, name: true, phone: true, email: true, address: true, city: true,
        photoUrl: true, outstandingBalance: true, notes: true, nic: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    res.status(201).json({
      id: newCustomer.id, name: newCustomer.name, phone: newCustomer.phone || '', email: newCustomer.email || '',
      address: newCustomer.address || '', city: newCustomer.city || '', photoUrl: newCustomer.photoUrl || '',
      outstandingBalance: newCustomer.outstandingBalance, notes: newCustomer.notes || '', nic: newCustomer.nic || '',
      totalOrders: newCustomer._count.orders, createdAt: newCustomer.createdAt,
    });
  } catch (error: any) {
    console.error('[CustomerRoutes] Error creating customer:', error);
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A customer with this phone number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }
});

// DELETE /api/customers/:id — Delete a customer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid customer ID' }); return; }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Customer not found' }); return; }

    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) {
      await prisma.customer.update({ where: { id }, data: { name: `[Deleted] ${existing.name}` } });
      res.json({ message: 'Customer deactivated (has existing orders)', softDeleted: true });
    } else {
      deleteOldImage(existing.photoUrl);
      await prisma.customer.delete({ where: { id } });
      res.json({ message: 'Customer deleted', softDeleted: false });
    }
  } catch (error) {
    console.error('[CustomerRoutes] Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;