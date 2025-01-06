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

// Importa tu config Multer
import { upload } from '../config/multer';

const router = Router();

router.use(authMiddleware);

// Rutas base
// CLAVE: usamos `upload.array('files')` en la ruta POST para que Multer procese el FormData
router.post('/', upload.array('files'), createPaymentRequest);
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
