// src/types/error.ts
export interface ApiError extends Error {
    code?: string;
    details?: any;
  }
  
  // Función helper para manejar errores
  export const handleError = (error: unknown): ApiError => {
    if (error instanceof Error) {
      return error as ApiError;
    }
    return new Error('Unknown error occurred');
  };