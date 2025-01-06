import { Role as PrismaRole } from '@prisma/client';
import 'express'; // Importamos los tipos de Express

declare global {
  namespace Express {
    // Ajusta el tipo Role para asegurar que tenga las props que tu código espera.
    interface Role extends PrismaRole {
      permissions: string[];
    }

    interface User {
      id: string;
      role: Role;
    }

    interface Request {
      user?: User;
    }
  }
}
