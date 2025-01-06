// src/routes/role.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createRole,
  getRoles,
  updateRole,
  assignRoleToUser
} from '../controllers/role.controller';
import { AuthUser } from '../types/common';

const router = Router();

const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as AuthUser | undefined;
  if (!user || user.role.name !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', (req: Request, res: Response) => createRole(req, res));
router.get('/', (req: Request, res: Response) => getRoles(req, res));
router.put('/:id', (req: Request, res: Response) => updateRole(req, res));
router.post('/assign', (req: Request, res: Response) => assignRoleToUser(req, res));

export default router;
