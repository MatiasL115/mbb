// src/routes/client.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient
} from '../controllers/client.controller';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas CRUD
router.get('/', getClients);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;