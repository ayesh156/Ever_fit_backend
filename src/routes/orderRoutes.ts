import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createOrder, getOrders, getOrderById, getOrdersByPhone, uploadReceipt, updateOrderStatus, updateOrder, downloadReceipt } from '../controllers/orderController';

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

router.get('/', getOrders);
router.get('/by-phone/:phone', getOrdersByPhone);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.post('/:id/upload-receipt', upload.single('receipt'), uploadReceipt);
router.get('/:id/download-receipt', downloadReceipt);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id', updateOrder);

export default router;