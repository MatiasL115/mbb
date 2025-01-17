// src/routes/project.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as ProjectController from '../controllers/project.controller';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas de este router
router.use(authMiddleware);

// Rutas base
router.get('/', ProjectController.getAll);
router.post('/', ProjectController.create);

// NUEVA RUTA: Summary de proyectos
router.get('/summary', ProjectController.getSummary);

// Rutas con parámetros
router.get('/:id', ProjectController.getById);
router.put('/:id', ProjectController.update);
router.delete('/:id', ProjectController.remove);

export default router;
