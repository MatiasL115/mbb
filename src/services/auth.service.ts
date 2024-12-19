// src/services/auth.service.ts
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role } from '@prisma/client';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: Partial<User>;
  message?: string;
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
        { id: user.id, role: user.role.name },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRES_IN }
      );

      const { passwordHash, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Error en el proceso de login');
    }
  }

  static async createUser(userData: CreateUserInput): Promise<Partial<User>> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('Ya existe un usuario con ese email');
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash,
          roleId: userData.roleId
        },
        include: {
          role: true
        }
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  static async getUserById(id: string): Promise<Partial<User> | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          role: true
        }
      });

      if (!user) return null;

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  static async updateUser(id: string, updateData: UpdateUserInput): Promise<Partial<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  static async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash }
      });

      return true;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  static async getAllUsers(filters: { 
    search?: string;
    roleId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: Partial<User>[]; total: number }> {
    try {
      const where: any = {};
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      if (filters.roleId) {
        where.roleId = filters.roleId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: filters.page ? (filters.page - 1) * (filters.limit || 10) : undefined,
          take: filters.limit || 10,
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
        users: usersWithoutPassword,
        total
      };
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  static async deactivateUser(id: string): Promise<Partial<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw error;
    }
  }

  static async activateUser(id: string): Promise<Partial<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE' },
        include: {
          role: true
        }
      });

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Activate user error:', error);
      throw error;
    }
  }

  static async verifyToken(token: string): Promise<{ id: string; role: string } | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: string; role: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export default AuthService;