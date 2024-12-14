// src/routes/role.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createRole,
  getRoles,
  updateRole,
  assignRoleToUser
} from '../controllers/role.controller';

const router = Router();

// Solo administradores pueden gestionar roles
const adminMiddleware = async (req: any, res: any, next: any) => {
  if (req.user.role.name !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', createRole);
router.get('/', getRoles);
router.put('/:id', updateRole);
router.post('/assign', assignRoleToUser);

export default router;