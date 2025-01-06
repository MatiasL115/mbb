// src/types/auth.ts
export interface AuthConfig {
    tokenKey: string;
    refreshTokenKey: string;
    tokenExpiry: number;
    refreshTokenExpiry: number;
  }
  
  export interface TokenPayload {
    id: string;
    role: {
      name: string;
      permissions: string[];
    }
  }