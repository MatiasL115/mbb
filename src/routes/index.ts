// src/routes/index.ts
import { Router } from 'express';
import providerRoutes from './provider.routes';
import paymentRequestRoutes from './payment-request.routes';

const router = Router();

router.use('/providers', providerRoutes);
router.use('/payment-requests', paymentRequestRoutes);

export default router;