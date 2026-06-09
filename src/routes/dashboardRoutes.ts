import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ── GET /api/dashboard/live-metrics ─────────────────────────────────────────
router.get('/live-metrics', async (_req: Request, res: Response) => {
  try {
    const now = new Date();

    // ── Today's date boundaries ──────────────────────────────────────────
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // ── Today's orders ───────────────────────────────────────────────────
    const todayOrders = await prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { paidAmount: true, status: true, totalAmount: true, id: true },
    });
    const yesterdayOrders = await prisma.order.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      select: { paidAmount: true, status: true },
    });

    const verifiedStatuses = ['PAID', 'PAYMENT_VERIFIED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const todayRevenue = todayOrders
      .filter(o => verifiedStatuses.includes(o.status))
      .reduce((s, o) => s + o.paidAmount, 0);
    const yesterdayRevenue = yesterdayOrders
      .filter(o => verifiedStatuses.includes(o.status))
      .reduce((s, o) => s + o.paidAmount, 0);

    const revenueGrowth = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayRevenue > 0 ? 100 : 0;

    // ── Pending orders count ─────────────────────────────────────────────
    const pendingOrdersCount = await prisma.order.count({
      where: { status: { in: ['PENDING', 'PENDING_RECEIPT', 'PAYMENT_REVIEW', 'PROCESSING'] } },
    });

    // ── Low stock items ──────────────────────────────────────────────────
    const lowStockVariants = await prisma.productVariant.findMany({
      where: { stock: { lt: 5 } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { stock: 'asc' },
      take: 5,
    });
    const lowStockItemsCount = await prisma.productVariant.count({
      where: { stock: { lt: 5 } },
    });

    // ── Total active customers (ever placed an order) ────────────────────
    const totalActiveCustomers = await prisma.customer.count();

    // ── Recent 5 orders ──────────────────────────────────────────────────
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerName: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // ── Format low stock for frontend ────────────────────────────────────
    const lowStockProducts = lowStockVariants.map(v => ({
      id: v.id,
      productId: v.product.id,
      productName: v.product.name,
      size: v.size,
      color: v.color,
      sku: v.sku,
      stock: v.stock,
    }));

    res.json({
      todayRevenue,
      revenueGrowth,
      pendingOrdersCount,
      lowStockItemsCount,
      totalActiveCustomers,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        customerName: o.customerName || 'Walk-in Customer',
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      lowStockProducts,
    });
  } catch (error) {
    console.error('[DashboardController] Error fetching live metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export default router;