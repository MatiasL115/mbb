import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { 
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  approveTechnical,
  approveFinancial,
  rejectRequest,
  getPendingRequests 
} from '../controllers/payment-request.controller';

const router = Router();

router.use(authMiddleware);

// Rutas base
router.post('/', createPaymentRequest);
router.get('/', getPaymentRequests);

// Rutas de pending - IMPORTANTE: estas rutas deben ir ANTES de la ruta /:id
router.get('/pending/technical', getPendingRequests);
router.get('/pending/financial', getPendingRequests);  // Agregamos esta ruta

// Ruta de detalle - debe ir DESPUÉS de las rutas específicas
router.get('/:id', getPaymentRequestById);

// Rutas de aprobación/rechazo
router.post('/:id/approve-technical', approveTechnical);
router.post('/:id/approve-financial', approveFinancial);
router.post('/:id/reject', rejectRequest);

export default router;