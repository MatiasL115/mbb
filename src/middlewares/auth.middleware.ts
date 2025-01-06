// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { AuthUser } from '../types/common'; // Ajusta el path si lo tienes en otro lugar.

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format'
      });
    }

    const token = tokenParts[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: 'User or role not found'
      });
    }

    // Convertir permissions a un array de strings si viene como JSON
    let permissionsArray: string[] = [];
    if (Array.isArray(user.role.permissions)) {
      permissionsArray = user.role.permissions as string[];
    } else {
      // Ajusta si se guarda de otra forma en la BD
      permissionsArray = [];
    }

    // Crear un rol extendido con permissions
    const extendedRole = {
      id: user.role.id,
      name: user.role.name,
      permissions: permissionsArray,
      createdAt: user.role.createdAt,
      updatedAt: user.role.updatedAt
    };

    // IMPORTANTE: Agregar la propiedad 'status' al objeto user
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      status: user.status,  // <--- AÑADIDO
      role: extendedRole
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
