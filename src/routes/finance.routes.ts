// src/routes/finance.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  registerPayment
} from '../controllers/finance.controller';

const router = Router();

router.use(authMiddleware);

router.post('/loans', createLoan);
router.get('/loans', getLoans);
router.get('/loans/:id', getLoanById);
router.put('/loans/:id', updateLoan);
router.post('/loans/:id/payments', registerPayment);

export default router;