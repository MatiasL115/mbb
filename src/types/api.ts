// src/types/api.ts
export interface ApiConfig {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }