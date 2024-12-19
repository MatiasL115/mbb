// src/routes/invoice.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  registerPayment,
  uploadDocument
} from '../controllers/invoice.controller';

const router = Router();
const upload = multer({ dest: 'uploads/invoices/' });

router.use(authMiddleware);

router.post('/', createInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.post('/:id/payments', registerPayment);
router.post('/:id/documents', upload.single('file'), uploadDocument);

export default router;