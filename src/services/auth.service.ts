// src/services/auth.service.ts
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role, Prisma } from '@prisma/client';
import { ApiResponse, AuthUser } from '../types/common'; 

// Definimos AppError como una clase
class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

interface LoginResponse extends ApiResponse<AuthUser> {
  token?: string;
}

interface UserResponse extends ApiResponse<Partial<User & { role: Role }>> {}

interface UsersListResponse extends ApiResponse<{
  users: Partial<User & { role: Role }>[];
  total: number;
}> {
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  roleId: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  roleId?: string;
}

interface UserFilters {
  search?: string;
  roleId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = '24h';

  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Contraseña incorrecta'
        };
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name,
          email: user.email,
          role: {
            id: user.role.id,
            name: user.role.name,
            permissions: user.role.permissions
          }
        },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRES_IN }
      );

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        data: userWithoutPassword as AuthUser
      };
    } catch (error) {
      throw new AppError('Error en el proceso de login');
    }
  }

  static async createUser(userData: CreateUserInput): Promise<UserResponse> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'Ya existe un usuario con ese email'
        };
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash,
          roleId: userData.roleId,
          // Asumimos que el modelo tiene un campo status
          status: 'ACTIVE'
        },
        include: {
          role: true
        }
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      throw new AppError('Error al crear usuario');
    }
  }

  static async getUserById(id: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          role: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      const { passwordHash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      throw new AppError('Error al obtener usuario');
    }
  }

  static async updateUser(id: string, updateData: UpdateUserInput): Promise<UserResponse> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword
      };
    } catch (error) {
      throw new AppError('Error al actualizar usuario');
    }
  }

  static async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Contraseña actual incorrecta'
        };
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash }
      });

      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
    } catch (error) {
      throw new AppError('Error al actualizar contraseña');
    }
  }

  static async getAllUsers(filters: UserFilters): Promise<UsersListResponse> {
    try {
      const where: Prisma.UserWhereInput = {
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }),
        ...(filters.roleId && { roleId: filters.roleId }),
        ...(filters.status && { status: filters.status })
      };

      const limit = filters.limit || 10;
      const offset = filters.page ? (filters.page - 1) * limit : 0;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: offset,
          take: limit,
          include: {
            role: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.user.count({ where })
      ]);

      const usersWithoutPassword = users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        success: true,
        data: {
          users: usersWithoutPassword,
          total
        },
        pagination: {
          total,
          limit,
          offset
        }
      };
    } catch (error) {
      throw new AppError('Error al obtener usuarios');
    }
  }

  static async deactivateUser(id: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { 
          status: 'INACTIVE' 
        },
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword,
        message: 'Usuario desactivado correctamente'
      };
    } catch (error) {
      throw new AppError('Error al desactivar usuario');
    }
  }

  static async activateUser(id: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { 
          status: 'ACTIVE' 
        },
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        data: userWithoutPassword,
        message: 'Usuario activado correctamente'
      };
    } catch (error) {
      throw new AppError('Error al activar usuario');
    }
  }

  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export default AuthService;
