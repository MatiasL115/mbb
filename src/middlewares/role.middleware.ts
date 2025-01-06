// src/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types/common'; // Ajusta la ruta según tu estructura

/**
 * Recibe un array de roles permitidos (por ej: ['ADMIN', 'FINANCIAL_APPROVER'])
 * y solo deja pasar si req.user.role.name coincide con alguno.
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Primero, check si user existe (authMiddleware ya debió setear req.user)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // Si el role del usuario no está en la lista allowedRoles => 403
    const userRole = req.user.role.name;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado',
      });
    }

    // Si pasa, sigue con la ruta
    next();
  };
};
