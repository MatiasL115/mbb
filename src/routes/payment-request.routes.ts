// src/routes/payment-request.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { 
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  approveTechnical,
  approveFinancial 
} from '../controllers/payment-request.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', createPaymentRequest);
router.get('/', getPaymentRequests);
router.get('/:id', getPaymentRequestById);
router.post('/:id/approve-technical', approveTechnical);
router.post('/:id/approve-financial', approveFinancial);

export default router;