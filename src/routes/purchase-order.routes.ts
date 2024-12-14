// src/routes/purchase-order.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById
} from '../controllers/purchase-order.controller';

const router = Router();

router.use(authMiddleware);

router.route('/')
  .post(createPurchaseOrder)
  .get(getPurchaseOrders);

router.route('/:id')
  .get(getPurchaseOrderById);

export default router;