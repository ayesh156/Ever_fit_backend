import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { io } from '../index';

// POST /api/orders — Create a new order with items and payment
export async function createOrder(req: Request, res: Response) {
  console.log("--- INCOMING CREATE PAYLOAD ---");
  console.dir(req.body, { depth: null });

  try {
    const {
      customerName,
      customerPhone,
      items,
      paymentMethod,
      paidAmount,
      discount,
      subtotal,
      dueDate,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required' });
      return;
    }

    // Parse all numeric values from the request body
    const parsedItems = items.map((item: any) => ({
      variantId: Number(item.variantId),
      quantity:  Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount:  Number(item.discount || 0),
    }));

    // Calculate total from items
    const total = parsedItems.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice - item.discount * item.quantity),
      0
    );
    const parsedSubtotal  = Number(subtotal) || total;
    const parsedDiscount  = Number(discount) || 0;
    const parsedPaidInput = paidAmount !== undefined && paidAmount !== '' ? Number(paidAmount) : undefined;
    const paid = typeof paidAmount === 'number'
      ? paidAmount
      : parsedPaidInput !== undefined
        ? parsedPaidInput
        : paymentMethod === 'credit' ? 0 : total;

    const status: any = paymentMethod === 'bank-transfer'
      ? 'PENDING_RECEIPT'
      : paid > 0 ? 'PAID' : 'PENDING';

    // Validate parsed items before hitting the DB
    for (const item of parsedItems) {
      if (isNaN(item.variantId) || item.variantId <= 0) {
        res.status(400).json({ error: `Invalid variantId: ${item.variantId}` });
        return;
      }
      if (isNaN(item.quantity) || item.quantity <= 0) {
        res.status(400).json({ error: `Invalid quantity: ${item.quantity}` });
        return;
      }
      if (isNaN(item.unitPrice) || item.unitPrice < 0) {
        res.status(400).json({ error: `Invalid unitPrice: ${item.unitPrice}` });
        return;
      }
    }

    console.log('[createOrder] Validated items:', parsedItems.length, '| total:', total, '| paid:', paid, '| status:', status);

    // Atomic transaction — all writes succeed or all roll back
    let order: any;
    try {
      order = await prisma.$transaction(async (tx) => {
        // 1. Create the Order record
        const created = await tx.order.create({
          data: {
            customerName:  customerName  || 'Walk-in Customer',
            customerPhone: customerPhone || null,
            totalAmount:   total,
            subtotal:      parsedSubtotal,
            discount:      parsedDiscount,
            paidAmount:    Math.min(paid, total),
            dueDate:       dueDate ? new Date(dueDate) : null,
            status,
            paymentMethod: paymentMethod || 'cash',
          },
        });
        console.log('[createOrder] Order row created, id:', created.id);

        // 2. Create OrderItems and decrement stock
        for (const item of parsedItems) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant) {
            throw new Error(`Invalid product variant selected: ${item.variantId}`);
          }
          const lineTotal = item.quantity * item.unitPrice - item.discount * item.quantity;
          await tx.orderItem.create({
            data: {
              orderId:   created.id,
              variantId: item.variantId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
              discount:  item.discount,
              price:     lineTotal,
            },
          });
          await tx.productVariant.update({
            where: { id: item.variantId },
            data:  { stock: { decrement: item.quantity } },
          });
        }
        console.log('[createOrder] All', parsedItems.length, 'items written');

        // 3. Create OrderPayment record
        if (paid > 0) {
          await tx.orderPayment.create({
            data: {
              orderId:   created.id,
              amount:    Math.min(paid, total),
              method:    paymentMethod || 'cash',
              reference: null,
            },
          });
          console.log('[createOrder] Payment record created');
        }

        // Return full order with relations for the response
        return tx.order.findUnique({
          where: { id: created.id },
          include: {
            items: {
              include: {
                variant: { include: { product: true } },
              },
            },
            payments: true,
          },
        });
      });
    } catch (prismaError: any) {
      console.error('PRISMA CREATION CRASH DETECTED:', prismaError);
      return res.status(500).json({ error: 'Prisma write failed', details: prismaError?.message ?? String(prismaError) });
    }

    console.log('[createOrder] Transaction complete. Order id:', order?.id);
    io.emit('newOrder', order);
    return res.status(201).json(order);

  } catch (error) {
    console.error('--- ORDER CREATION ERROR ---', error);
    return res.status(500).json({ error: 'Failed to create order', details: error instanceof Error ? error.message : String(error) });
  }
}

// GET /api/orders — Fetch all orders with items and payments
export async function getOrders(_req: Request, res: Response) {
  try {
    const totalCount = await prisma.order.count();
    console.log('[getOrders] RAW PRISMA CHECK - Total rows in DB:', totalCount);
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
    console.log(`[getOrders] Returning ${orders.length} orders to client`);
    res.json(orders);
  } catch (error) {
    console.error('[OrderController] getOrders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error instanceof Error ? error.message : String(error) });
  }
}

// GET /api/orders/:id — Fetch a single order by ID
export async function getOrderById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('[OrderController] getOrderById error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

// POST /api/orders/:id/upload-receipt — Upload payment receipt
export async function uploadReceipt(req: Request, res: Response) {
  console.log("--- UPLOAD HIT ---");
  console.log("File:", req.file);
  console.log("Body:", req.body);
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file received by multer. Check frontend formData name and headers." });
    }

    // Delete old receipt file if it exists
    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (existingOrder?.paymentReceiptUrl) {
      const oldPath = path.join(__dirname, '../../public', existingOrder.paymentReceiptUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('[uploadReceipt] Deleted old file:', oldPath);
      }
    }

    const fileUrl = '/uploads/receipts/' + req.file.filename;
    console.log('[uploadReceipt] File saved:', req.file.path, 'URL:', fileUrl);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentReceiptUrl: fileUrl,
        status: 'PAYMENT_REVIEW',
      },
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

    io.emit('orderUpdated', updatedOrder);
    io.emit('orderStatusUpdated', { orderId: id, status: 'PAYMENT_REVIEW' });
    console.log('[uploadReceipt] Emitted socket events for order', id);
    res.json(updatedOrder);
  } catch (error) {
    console.error("UPLOAD CRASH:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

// GET /api/orders/by-phone/:phone — Lookup orders by phone
export async function getOrdersByPhone(req: Request, res: Response) {
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
}

// GET /api/orders/:id/download-receipt — Download receipt with proper filename
export const downloadReceipt = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log("Order ID received:", rawId);
    const order = await prisma.order.findUnique({ where: { id: parseInt(rawId, 10) } });

    if (!order || !order.paymentReceiptUrl) return res.status(404).json({ error: "Receipt not found" });

    // DEBUG — log what the DB returned and where __dirname points at runtime
    console.log("DEBUG - paymentReceiptUrl from DB:", order.paymentReceiptUrl);
    console.log("DEBUG - Current __dirname:", __dirname);

    // Multer saves files to:  backend/public/uploads/receipts/<file>
    // DB stores the URL as:   /uploads/receipts/<file>
    // So we need:             <backend root>/public  +  /uploads/receipts/<file>
    const rootPath = path.resolve(__dirname, '../../');
    const filePath = path.join(rootPath, 'public', order.paymentReceiptUrl);

    console.log("DEBUG - Final resolved filePath:", filePath);

    // Verify file exists before attempting download
    if (!fs.existsSync(filePath)) {
      console.error("FILE DOES NOT EXIST AT PATH:", filePath);
      return res.status(404).json({ error: "File not found on server" });
    }

    const ext = path.extname(filePath) || '.jpg';
    const fileName = `Receipt-ORD${order.id}${ext}`;

    res.download(filePath, fileName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: "Download failed" });
  }
};

// PATCH /api/orders/:id/status — Update order status (admin)
export async function updateOrderStatus(req: Request, res: Response) {  try {
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

    // When admin approves receipt (moves to PROCESSING), auto-set paidAmount = totalAmount
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

    io.emit('orderUpdated', updatedOrder);
    io.emit('orderStatusUpdated', { orderId: id, status });
    res.json(updatedOrder);
  } catch (error) {
    console.error('[OrderController] updateOrderStatus error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

// PATCH /api/orders/:id — General order update (status, paidAmount, notes, dueDate, etc.)
export async function updateOrder(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    console.log('[updateOrder] Updating order', id, '— payload:', JSON.stringify(req.body));

    // Pre-fetch existing order so we can fall back to current values for any field not sent
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const {
      status,
      paidAmount,
      customerName,
      customerPhone,
      paymentMethod,
      dueDate,
    } = req.body;

    // Build only fields that were explicitly sent; fall back to existing value otherwise
    const data: Record<string, any> = {
      status:        status        !== undefined ? status              : existing.status,
      paidAmount:    paidAmount    !== undefined ? Number(paidAmount)  : existing.paidAmount,
      customerName:  customerName  !== undefined ? customerName        : existing.customerName,
      customerPhone: customerPhone !== undefined ? customerPhone       : existing.customerPhone,
      paymentMethod: paymentMethod !== undefined ? paymentMethod       : existing.paymentMethod,
      dueDate:       dueDate       !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
    };

    console.log('[updateOrder] Final data to write:', JSON.stringify(data));

    const updatedOrder = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
        payments: true,
      },
    });

    io.emit('orderUpdated', updatedOrder);
    io.emit('orderStatusUpdated', { orderId: id, status: data.status });
    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('[OrderController] updateOrder error:', error);
    return res.status(500).json({ error: 'Failed to update order', details: error instanceof Error ? error.message : String(error) });
  }
}