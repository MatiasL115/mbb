import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

// Extender la interfaz de Request para incluir el usuario
interface RequestWithUser extends Request {
  user?: {
    id: string;
    role: {
      name: string;
    };
  };
}

export const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Obtener el encabezado de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;

    // Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true } // Incluir el rol del usuario
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Agregar el usuario a la request para usarlo en controladores posteriores
    req.user = user;

    // Continuar al siguiente middleware o controlador
    next();
  } catch (error) {
    // Manejo de errores específicos de JWT
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    // Errores generales
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
