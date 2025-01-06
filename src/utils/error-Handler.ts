// src/utils/error-handler.ts
import { Response } from 'express';
import { AppError, PrismaError, isPrismaError } from '../types/common';

export const handleError = (error: unknown): AppError => {
  if (error instanceof Error) {
    return error as AppError;
  }
  return new Error('Unknown error occurred');
};

export const sendErrorResponse = (res: Response, error: unknown) => {
  if (isPrismaError(error)) {
    return res.status(400).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }

  const appError = handleError(error);
  return res.status(500).json({
    success: false,
    message: appError.message,
    error: process.env.NODE_ENV === 'development' ? appError : undefined
  });
};