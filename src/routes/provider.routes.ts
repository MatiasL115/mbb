import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as providerController from '../controllers/provider.controller';
import { upload } from '../config/multer';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas básicas
router.get('/', providerController.getProviders);
router.get('/:id', providerController.getProviderById);
router.post('/', upload.single('logo'), providerController.createProvider);
router.put('/:id', upload.single('logo'), providerController.updateProvider);
router.delete('/:id', providerController.deleteProvider);

// Ruta de estadísticas
router.get('/:id/stats', providerController.getProviderStats);

export default router;