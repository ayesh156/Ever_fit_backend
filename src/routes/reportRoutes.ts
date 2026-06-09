import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import PDFDocument from 'pdfkit';

const router = Router();

// ── Helper: format currency for PDF ─────────────────────────────────────────
const fmt = (n: number) => `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;

// ── Helper: format date ────────────────────────────────────────────────────
const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ── GET /api/reports/download-pdf ──────────────────────────────────────────
router.get('/download-pdf', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, rangeType, month, year } = req.query;

    // Build date filter for orders
    const now = new Date();
    let dateFilter: { gte?: Date; lte?: Date } = {};
    let periodLabel = 'All Time';

    if (rangeType === 'today') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodLabel = 'Today';
    } else if (rangeType === '7d') {
      dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = 'Last 7 Days';
    } else if (rangeType === '30d') {
      dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodLabel = 'Last 30 Days';
    } else if (rangeType === 'month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'This Month';
    } else if (rangeType === 'custom' && startDate && endDate) {
      dateFilter.gte = new Date(String(startDate));
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
      periodLabel = `${fmtDate(new Date(String(startDate)))} — ${fmtDate(new Date(String(endDate)))}`;
    }

    // Month/Year override: if month or year is specified, filter by those too
    const monthNum = month ? Number(month) : 0;
    const yearNum = year ? Number(year) : 0;

    // Fetch all orders (we'll filter month/year in-memory since Prisma date-part queries are complex)
    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });

    // Apply date range filter
    let filteredOrders = allOrders;
    if (dateFilter.gte || dateFilter.lte) {
      filteredOrders = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        if (dateFilter.gte && d < dateFilter.gte) return false;
        if (dateFilter.lte && d > dateFilter.lte) return false;
        return true;
      });
    }

    // Apply month/year
    if (monthNum > 0 || yearNum > 0) {
      filteredOrders = filteredOrders.filter(o => {
        const d = new Date(o.createdAt);
        if (yearNum > 0 && d.getFullYear() !== yearNum) return false;
        if (monthNum > 0 && d.getMonth() + 1 !== monthNum) return false;
        return true;
      });
    }

    // Build period label with month/year
    if (monthNum > 0) {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      periodLabel += ` · ${months[monthNum - 1]}`;
    }
    if (yearNum > 0) periodLabel += ` ${yearNum}`;

    // ═══════ Compute KPIs ═══════
    const verifiedStatuses = ['PAID', 'PAYMENT_VERIFIED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const verifiedOrders = filteredOrders.filter(o => verifiedStatuses.includes(o.status));
    const totalRevenue = verifiedOrders.reduce((s, o) => s + o.paidAmount, 0);
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(o => ['PENDING', 'PENDING_RECEIPT', 'PAYMENT_REVIEW'].includes(o.status)).length;
    const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED').length;
    const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    // Unique customers
    const customerSet = new Set<string>();
    filteredOrders.forEach(o => {
      if (o.customerId) customerSet.add(`id:${o.customerId}`);
      else if (o.customerPhone) customerSet.add(`phone:${o.customerPhone}`);
      else if (o.customerName) customerSet.add(`name:${o.customerName}`);
    });
    const totalCustomers = customerSet.size;

    // Total registered customers
    const totalRegisteredCustomers = await prisma.customer.count();

    // ═══════ Sales Trend (Daily) ═══════
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    verifiedOrders.forEach(o => {
      const dk = o.createdAt.toISOString().split('T')[0];
      const e = dailyMap.get(dk) || { revenue: 0, orders: 0 };
      e.revenue += o.paidAmount;
      e.orders += 1;
      dailyMap.set(dk, e);
    });
    const dailySales = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ═══════ Status Distribution ═══════
    const statusCounts: Record<string, number> = { PENDING: 0, PAID: 0, CANCELLED: 0, PENDING_RECEIPT: 0, PAYMENT_REVIEW: 0, PAYMENT_VERIFIED: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0 };
    filteredOrders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });
    const totalFiltered = filteredOrders.length || 1;
    const statusLabels: Record<string, string> = { PENDING: 'Pending', PAID: 'Paid', CANCELLED: 'Cancelled', PENDING_RECEIPT: 'Pending Receipt', PAYMENT_REVIEW: 'Payment Review', PAYMENT_VERIFIED: 'Payment Verified', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered' };
    const statusData = Object.keys(statusCounts)
      .filter(k => statusCounts[k] > 0)
      .map(k => ({ name: statusLabels[k] || k, count: statusCounts[k], pct: Math.round((statusCounts[k] / totalFiltered) * 100) }))
      .sort((a, b) => b.count - a.count);

    // ═══════ Top Products ═══════
    const productMap = new Map<string, { unitsSold: number; revenue: number }>();
    verifiedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const productName = item.variant?.product?.name || `Product #${item.variant?.product?.id || item.variantId}`;
        const e = productMap.get(productName) || { unitsSold: 0, revenue: 0 };
        e.unitsSold += item.quantity;
        e.revenue += item.price;
        productMap.set(productName, e);
      });
    });
    const topProducts = Array.from(productMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const topProdTotalRev = topProducts.reduce((s, p) => s + p.revenue, 0);

    // ═══════ Build PDF ═══════
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: 'EverFit Executive Report',
        Author: 'Ever Fit Fashion System',
        Subject: 'Executive Performance Report',
      },
    });

    // Set response headers
    const filename = `EverFit_Executive_Report_${now.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Constants (100% Solid Black) ──
    const margin = doc.page.margins.left;
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const usableWidth = pageW;
    const BLACK = '#000000';

    // ── Helper: render a section title with black underline BELOW the text ──
    const sectionTitle = (title: string, y: number) => {
      doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK);
      doc.text(title, margin, y, { width: usableWidth });
      const lineY = doc.y + 4;
      doc.moveTo(margin, lineY).lineTo(margin + pageW, lineY).strokeColor(BLACK).lineWidth(1.5).stroke();
      return lineY + 12;
    };

    const kpiCard = (label: string, value: string, subtext: string, x: number, y: number, w: number) => {
      doc.roundedRect(x, y, w, 38, 4).fillColor('#ffffff').strokeColor(BLACK).lineWidth(0.5).fillAndStroke();
      doc.fillColor(BLACK).fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x + 6, y + 5, { width: w - 12, align: 'center' });
      doc.fillColor(BLACK).fontSize(13).font('Helvetica-Bold').text(value, x + 6, y + 14, { width: w - 12, align: 'center' });
      doc.fillColor(BLACK).fontSize(6.5).font('Helvetica').text(subtext, x + 6, y + 28, { width: w - 12, align: 'center' });
    };

    const tableHeader = (cols: { label: string; x: number; w: number; align: string }[], y: number) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BLACK);
      cols.forEach(c => {
        doc.text(c.label.toUpperCase(), c.x, y, { width: c.w, align: c.align as any });
      });
      const lastCol = cols[cols.length - 1];
      doc.moveTo(doc.page.margins.left, y + 11).lineTo(lastCol.x + lastCol.w, y + 11).strokeColor(BLACK).lineWidth(0.8).stroke();
      return y + 20;
    };

    const tableRow = (cells: { text: string; x: number; w: number; align: string; bold?: boolean }[], y: number) => {
      doc.fontSize(8.5).font(cells.some(c => c.bold) ? 'Helvetica-Bold' : 'Helvetica').fillColor(BLACK);
      cells.forEach(c => {
        doc.text(c.text, c.x, y, { width: c.w, align: c.align as any });
      });
      doc.moveTo(doc.page.margins.left, y + 13).lineTo(doc.page.margins.left + pageW, y + 13).strokeColor(BLACK).lineWidth(0.3).stroke();
      return y + 20;
    };

    const checkPage = (y: number, needed: number = 60) => {
      if (y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        return doc.page.margins.top;
      }
      return y;
    };

    let y = doc.page.margins.top;

    // ══ HEADER (all pure black) ══
    doc.fontSize(18).font('Helvetica-Bold').fillColor(BLACK);
    doc.text('EVER FIT FASHION SYSTEM', margin, y, { align: 'center', width: usableWidth });
    y = doc.y + 8;
    doc.fontSize(10).font('Helvetica').fillColor(BLACK);
    doc.text('Executive Performance Report', margin, y, { align: 'center', width: usableWidth });
    y = doc.y + 6;
    doc.fontSize(8).font('Helvetica').fillColor(BLACK);
    doc.text(
      `Generated: ${fmtDate(now)} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}  |  Period: ${periodLabel}`,
      margin, y, { align: 'center', width: usableWidth }
    );
    y = doc.y + 6;
    doc.moveTo(margin, y).lineTo(margin + pageW, y).strokeColor(BLACK).lineWidth(2).stroke();
    y += 20;

    // ══ KPI SUMMARY ══
    y = sectionTitle('Financial Summary', y);
    const cardW = (pageW - 12) / 4;
    kpiCard('Total Revenue', fmt(totalRevenue), `${verifiedOrders.length} verified payments`, doc.page.margins.left, y, cardW);
    kpiCard('Total Orders', String(totalOrders), `${pendingOrders} pending / ${deliveredOrders} delivered`, doc.page.margins.left + cardW + 4, y, cardW);
    kpiCard('Active Customers', String(totalRegisteredCustomers), `${totalCustomers} have placed orders`, doc.page.margins.left + 2 * (cardW + 4), y, cardW);
    kpiCard('Fulfillment Rate', `${fulfillmentRate.toFixed(1)}%`, `${deliveredOrders} of ${totalOrders} delivered`, doc.page.margins.left + 3 * (cardW + 4), y, cardW);
    y += 52;

    // ══ SALES TREND ══
    y = checkPage(y, 30 + dailySales.length * 17);
    y = sectionTitle('Sales Trend Breakdown', y);
    const colX = { date: doc.page.margins.left, revenue: doc.page.margins.left + pageW * 0.5, orders: doc.page.margins.left + pageW * 0.78 };
    const colW = { date: pageW * 0.48, revenue: pageW * 0.26, orders: pageW * 0.22 };
    y = tableHeader([
      { label: 'Date', x: colX.date, w: colW.date, align: 'left' },
      { label: 'Revenue', x: colX.revenue, w: colW.revenue, align: 'right' },
      { label: 'Orders', x: colX.orders, w: colW.orders, align: 'center' },
    ], y);
    (dailySales.length > 0 ? dailySales : [{ date: '—', revenue: 0, orders: 0 }]).forEach(d => {
      y = checkPage(y, 17);
      y = tableRow([
        { text: d.date === '—' ? 'No data' : fmtDate(new Date(d.date)), x: colX.date, w: colW.date, align: 'left' },
        { text: d.date === '—' ? '' : fmt(d.revenue), x: colX.revenue, w: colW.revenue, align: 'right', bold: true },
        { text: d.date === '—' ? '' : String(d.orders), x: colX.orders, w: colW.orders, align: 'center' },
      ], y);
    });

    // ══ STATUS DISTRIBUTION ══
    y = checkPage(y, 30 + statusData.length * 17);
    y = sectionTitle('Order Status Summary', y);
    y = tableHeader([
      { label: 'Status', x: colX.date, w: colW.date, align: 'left' },
      { label: 'Count', x: colX.revenue, w: colW.revenue, align: 'center' },
      { label: '% Share', x: colX.orders, w: colW.orders, align: 'right' },
    ], y);
    (statusData.length > 0 ? statusData : [{ name: 'No data', count: 0, pct: 0 }]).forEach(s => {
      y = checkPage(y, 17);
      y = tableRow([
        { text: s.name, x: colX.date, w: colW.date, align: 'left' },
        { text: String(s.count), x: colX.revenue, w: colW.revenue, align: 'center', bold: true },
        { text: `${s.pct}%`, x: colX.orders, w: colW.orders, align: 'right', bold: true },
      ], y);
    });

    // ══ TOP PRODUCTS ══
    y = checkPage(y, 30 + topProducts.length * 20);
    y = sectionTitle('Top 5 Best Selling Products', y);
    const prodCols = {
      rank: doc.page.margins.left,
      name: doc.page.margins.left + pageW * 0.08,
      units: doc.page.margins.left + pageW * 0.58,
      revenue: doc.page.margins.left + pageW * 0.76,
      share: doc.page.margins.left + pageW * 0.92,
    };
    const prodW = {
      rank: pageW * 0.07,
      name: pageW * 0.48,
      units: pageW * 0.16,
      revenue: pageW * 0.14,
      share: pageW * 0.08,
    };
    y = tableHeader([
      { label: '#', x: prodCols.rank, w: prodW.rank, align: 'center' },
      { label: 'Product Name', x: prodCols.name, w: prodW.name, align: 'left' },
      { label: 'Units Sold', x: prodCols.units, w: prodW.units, align: 'center' },
      { label: 'Revenue', x: prodCols.revenue, w: prodW.revenue, align: 'right' },
      { label: 'Share', x: prodCols.share, w: prodW.share, align: 'right' },
    ], y);
    (topProducts.length > 0 ? topProducts : [{ name: 'No product data', unitsSold: 0, revenue: 0 }]).forEach((p, i) => {
      y = checkPage(y, 17);
      const share = topProdTotalRev > 0 ? `${((p.revenue / topProdTotalRev) * 100).toFixed(1)}%` : '—';
      y = tableRow([
        { text: String(i + 1), x: prodCols.rank, w: prodW.rank, align: 'center' },
        { text: p.name, x: prodCols.name, w: prodW.name, align: 'left' },
        { text: String(p.unitsSold), x: prodCols.units, w: prodW.units, align: 'center', bold: true },
        { text: p.name === 'No product data' ? '' : fmt(p.revenue), x: prodCols.revenue, w: prodW.revenue, align: 'right', bold: true },
        { text: share, x: prodCols.share, w: prodW.share, align: 'right' },
      ], y);
    });

    // ══ FOOTER (pure black) ══
    y = checkPage(y, 40);
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageW, y).strokeColor(BLACK).lineWidth(0.4).stroke();
    y += 10;
    doc.fontSize(7.5).font('Helvetica').fillColor(BLACK);
    doc.text(
      'Ever Fit Fashion System — Executive Analytics — Confidential — Data from live API',
      margin, y, { align: 'center', width: usableWidth }
    );

    doc.end();
  } catch (error) {
    console.error('[ReportController] Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
});

export default router;