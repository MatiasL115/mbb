// src/routes/documents.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  // PurchaseInvoice
  createPurchaseInvoice,
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  // CreditNote
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
  // Receipt
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  deleteReceipt
} from '../controllers/document.controller';

const router = Router();
router.use(authMiddleware);

// ===============================
// PurchaseInvoice routes
// ===============================
router.post('/invoices', createPurchaseInvoice);
router.get('/invoices', getPurchaseInvoices);
router.get('/invoices/:id', getPurchaseInvoiceById);
router.put('/invoices/:id', updatePurchaseInvoice);
router.delete('/invoices/:id', deletePurchaseInvoice);

// ===============================
// CreditNote routes
// ===============================
router.post('/credit-notes', createCreditNote);
router.get('/credit-notes', getCreditNotes);
router.get('/credit-notes/:id', getCreditNoteById);
router.put('/credit-notes/:id', updateCreditNote);
router.delete('/credit-notes/:id', deleteCreditNote);

// ===============================
// Receipt routes
// ===============================
router.post('/receipts', createReceipt);
router.get('/receipts', getReceipts);
router.get('/receipts/:id', getReceiptById);
router.put('/receipts/:id', updateReceipt);
router.delete('/receipts/:id', deleteReceipt);

export default router;
