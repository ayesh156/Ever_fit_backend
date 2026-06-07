import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { getIO } from '../lib/socket';

const router = Router();

// Setup multer for receipt uploads
const uploadDir = path.join(__dirname, '../../public/uploads/receipts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'receipt-' + Date.now() + ext);
  },
});
const upload = multer({ storage });

// GET /api/orders — Fetch all orders
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
    });
    res.json(orders);
  } catch (error) {
    console.error('[OrderController] getOrders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/by-phone/:phone — Lookup orders by phone
router.get('/by-phone/:phone', async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone);
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }
    const orders = await prisma.order.findMany({
      where: { customerPhone: { contains: phone } },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });
    res.json(orders);
  } catch (error) {
    console.error('[OrderController] getOrdersByPhone error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id — Fetch a single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (error) {
    console.error('[OrderController] getOrderById error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders — Create a new order (auto-creates/upserts customer by phone)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, customerId, items, paymentMethod, paidAmount, discount, subtotal, dueDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required' });
      return;
    }

    const parsedItems = items.map((item: any) => ({
      variantId: Number(item.variantId),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount || 0),
    }));

    const total = parsedItems.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice - item.discount * item.quantity),
      0
    );
    const parsedSubtotal = Number(subtotal) || total;
    const parsedDiscount = Number(discount) || 0;
    const paid = typeof paidAmount === 'number' ? paidAmount : total;
    const status: any = paid > 0 ? 'PAID' : 'PENDING';

    // Auto-create or find customer by phone if customerId not provided
    let customerIdNum: number | null = null;
    if (customerId) {
      customerIdNum = Number(customerId);
    } else if (customerPhone && customerPhone.trim() && customerName && customerName !== 'Walk-in Customer') {
      // Try to find existing customer by phone
      const existing = await prisma.customer.findUnique({
        where: { phone: customerPhone.trim() },
      });
      if (existing) {
        customerIdNum = existing.id;
      } else {
        // Create new customer
        const newCustomer = await prisma.customer.create({
          data: {
            name: customerName,
            phone: customerPhone.trim(),
          },
        });
        customerIdNum = newCustomer.id;
      }
    }

    const order = await prisma.order.create({
      data: {
        customerId: customerIdNum,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || null,
        totalAmount: total,
        subtotal: parsedSubtotal,
        discount: parsedDiscount,
        paidAmount: Math.min(paid, total),
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        paymentMethod: paymentMethod || 'cash',
        items: {
          create: parsedItems.map((item: any) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            price: item.quantity * item.unitPrice - item.discount * item.quantity,
          })),
        },
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });

    // Emit real-time event so admin dashboard and any connected client receive the
    // fully-hydrated order object (including items) immediately — no page refresh needed.
    getIO().emit('newOrder', order);

    res.status(201).json(order);
  } catch (error) {
    console.error('[OrderController] createOrder error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/orders/:id/upload-receipt
router.post('/:id/upload-receipt', upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file received' });
      return;
    }

    const fileUrl = '/uploads/receipts/' + req.file.filename;
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentReceiptUrl: fileUrl,
        status: 'PAYMENT_REVIEW',
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });

    // Notify all connected clients that this order's status changed to PAYMENT_REVIEW
    getIO().emit('orderUpdated', updatedOrder);
    getIO().emit('orderStatusUpdated', { orderId: id, status: updatedOrder.status });

    res.json(updatedOrder);
  } catch (error) {
    console.error('[uploadReceipt] error:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// GET /api/orders/:id/download-receipt
router.get('/:id/download-receipt', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || !order.paymentReceiptUrl) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    const rootPath = path.resolve(__dirname, '../../');
    const filePath = path.join(rootPath, 'public', order.paymentReceiptUrl);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on server' });
      return;
    }

    const ext = path.extname(filePath) || '.jpg';
    const fileName = `Receipt-ORD${order.id}${ext}`;
    res.download(filePath, fileName);
  } catch (error) {
    console.error('[downloadReceipt] error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const updateData: any = { status };
    if (status === 'PROCESSING') {
      const order = await prisma.order.findUnique({ where: { id } });
      if (order && order.paidAmount < order.totalAmount) {
        updateData.paidAmount = order.totalAmount;
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });

    // Emit both events so admin dashboard (orderUpdated) and storefront
    // TrackOrder page (orderStatusUpdated) both update in real-time.
    getIO().emit('orderUpdated', updatedOrder);
    getIO().emit('orderStatusUpdated', { orderId: id, status: updatedOrder.status });

    res.json(updatedOrder);
  } catch (error) {
    console.error('[updateOrderStatus] error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PATCH /api/orders/:id — General order update
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const { status, paidAmount, customerName, customerPhone, paymentMethod, dueDate } = req.body;

    const data: Record<string, any> = {
      status: status !== undefined ? status : existing.status,
      paidAmount: paidAmount !== undefined ? Number(paidAmount) : existing.paidAmount,
      customerName: customerName !== undefined ? customerName : existing.customerName,
      customerPhone: customerPhone !== undefined ? customerPhone : existing.customerPhone,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
    };

    const updatedOrder = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });

    // Emit real-time update for any field change (status, payment, customer info, etc.)
    getIO().emit('orderUpdated', updatedOrder);
    getIO().emit('orderStatusUpdated', { orderId: id, status: updatedOrder.status });

    res.json(updatedOrder);
  } catch (error) {
    console.error('[updateOrder] error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;