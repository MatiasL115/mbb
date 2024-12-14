// src/routes/provider.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as providerController from '../controllers/provider.controller';

const router = Router();

router.use(authMiddleware); // Protege todas las rutas de proveedores

router.post('/', providerController.createProvider);
router.get('/', providerController.getProviders);
router.get('/:id', providerController.getProviderById);
router.put('/:id', providerController.updateProvider);
router.delete('/:id', providerController.deleteProvider);

export default router;