// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  api: {
    port: process.env.PORT || 3000,
    url: process.env.API_URL || 'http://localhost:3000',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d'
  },
  env: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL
  }
};