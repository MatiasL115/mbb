// src/routes/purchase-order.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as PurchaseOrderController from '../controllers/purchase-order.controller';

const router = Router();

router.use(authMiddleware);

// Rutas específicas - IMPORTANTE: deben ir ANTES de las rutas con :id
router.get('/next-number', PurchaseOrderController.getNextNumber);
router.get('/export', PurchaseOrderController.exportToExcel);

// Rutas de aprobación - deben ir ANTES de las rutas genéricas con :id
router.post('/:id/approve', PurchaseOrderController.approve); // AGREGAR ESTA RUTA
router.post('/:id/reject', PurchaseOrderController.reject);   // Y ESTA

// Rutas base
router.get('/', PurchaseOrderController.getAll);
router.post('/', PurchaseOrderController.create);

// Rutas con :id - deben ir AL FINAL
router.get('/:id', PurchaseOrderController.getById);
router.get('/:id/pdf', PurchaseOrderController.downloadPdf);

export default router;