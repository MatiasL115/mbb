// src/routes/auth.routes.ts
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as roleController from '../controllers/role.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas de usuarios
router.post('/users', authController.createUser);
router.get('/users', authController.getUsers);
router.get('/users/:id', authController.getUserById);
router.put('/users/:id', authController.updateUser);

// Rutas de roles
router.get('/roles', roleController.getRoles);
router.post('/roles', roleController.createRole);
router.put('/roles/:id', roleController.updateRole);
router.post('/roles/assign', roleController.assignRoleToUser);

export default router;