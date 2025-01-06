// src/types/routes.ts
export interface RouteConfig {
    PUBLIC: {
      LOGIN: string;
      // otras rutas públicas
    };
    PRIVATE: {
      DASHBOARD: string;
      REQUESTS: string;
      // otras rutas protegidas
    };
  }