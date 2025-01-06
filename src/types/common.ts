// src/types/common.ts
import { User, Role, Prisma } from '@prisma/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

export interface AuthUser extends Omit<User, 'passwordHash'> {
  role: Role;
}

// Definición de errores de Prisma
export type PrismaError = 
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientValidationError;

export function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Prisma.PrismaClientKnownRequestError ||
         error instanceof Prisma.PrismaClientUnknownRequestError ||
         error instanceof Prisma.PrismaClientValidationError;
}

export class AppError extends Error {
  code?: string;
  details?: unknown;
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}
