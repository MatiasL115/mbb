// src/routes/reports.routes.ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getDashboardStats, getPaymentRequestsReport, getPurchaseOrdersReport } from '../controllers/reports.controller';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', (req: Request, res: Response) => getDashboardStats(req, res));
router.get('/payment-requests', (req: Request, res: Response) => getPaymentRequestsReport(req, res));
router.get('/purchase-orders', (req: Request, res: Response) => getPurchaseOrdersReport(req, res));

export default router;
