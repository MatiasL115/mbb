// src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import * as authController from '../controllers/auth.controller';
import * as roleController from '../controllers/role.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/register', (req: Request, res: Response) => authController.register(req, res));
router.post('/login', (req: Request, res: Response) => authController.login(req, res));

// Rutas autenticadas
router.use(authMiddleware);

// Si necesitas roles:
router.get('/roles', (req: Request, res: Response) => roleController.getRoles(req, res));
router.post('/roles', (req: Request, res: Response) => roleController.createRole(req, res));
router.put('/roles/:id', (req: Request, res: Response) => roleController.updateRole(req, res));
router.post('/roles/assign', (req: Request, res: Response) => roleController.assignRoleToUser(req, res));

// Rutas de usuarios
router.post('/users', (req: Request, res: Response) => authController.createUser(req, res));
router.get('/users', (req: Request, res: Response) => authController.getUsers(req, res));
router.get('/users/:id', (req: Request, res: Response) => authController.getUserById(req, res));
router.put('/users/:id', (req: Request, res: Response) => authController.updateUser(req, res));
// ... y así sucesivamente para las rutas que necesites

export default router;
