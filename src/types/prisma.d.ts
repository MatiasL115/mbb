// src/types/prisma.d.ts
import { Prisma } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: {
          name: string;
          permissions: string[];
        }
      }
    }
  }
}

export type PrismaError = Prisma.PrismaClientKnownRequestError | 
  Prisma.PrismaClientUnknownRequestError | 
  Prisma.PrismaClientRustPanicError | 
  Prisma.PrismaClientInitializationError | 
  Prisma.PrismaClientValidationError;