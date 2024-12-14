// src/routes/reports.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getDashboardStats,
  getPaymentRequestsReport,
  getPurchaseOrdersReport
} from '../controllers/reports.controller';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/payment-requests', getPaymentRequestsReport);
router.get('/purchase-orders', getPurchaseOrdersReport);

export default router;