// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from './config/prisma';

// Importación de rutas
import authRoutes from './routes/auth.routes';
import providerRoutes from './routes/provider.routes';
import paymentRequestRoutes from './routes/payment-request.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import reportsRoutes from './routes/reports.routes';
import financeRoutes from './routes/finance.routes';
import bankRoutes from './routes/bank.routes';
import projectRoutes from './routes/project.routes';
import invoiceRoutes from './routes/invoice.routes';
import budgetRoutes from './routes/budget.routes';
import dashboardRoutes from './routes/dashboard.routes';
import clientRoutes from './routes/client.routes';
import categoryRoutes from './routes/category.routes';
import documentsRoutes from './routes/document.routes';

// Cargar variables de entorno
dotenv.config();

// Crear carpeta uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Crear instancia de Express
const app = express();
const port = process.env.PORT || 3000;

// Configuración de multer para manejo de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  },
});

// Configuración de CORS mejorada
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://165.22.186.220',
    'https://mbigua.sdp.lat',
    'https://api-mobile.mbigua.sdp.lat',
    'https://api-mobile.mbigua.sdp.lat:8443',
    'https://mbigua.sdp.lat:8443',
    'exp://*',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://192.168.0.6:3000',
    'http://192.168.0.6:19000',
    'exp://192.168.0.6:19000',
    'exp://192.168.0.17:8081',
    'http://192.168.0.17:8081',
    'http://localhost:8081'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'DNT',
    'X-CustomHeader',
    'Keep-Alive',
    'User-Agent',
    'If-Modified-Since',
    'Cache-Control',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOptions.origin.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS bloqueado para origen: ${origin}`);
      callback(new Error('CORS no permitido'));
    }
  },
  methods: corsOptions.methods,
  allowedHeaders: corsOptions.allowedHeaders,
  credentials: true,
}));

// Middleware de análisis de cuerpo de solicitud
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Headers de seguridad adicionales
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware de logging mejorado
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers));

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Healthcheck
app.get('/', async (req: Request, res: Response) => {
  const uptime = process.uptime();
  const dbStatus = await prisma.$connect()
    .then(() => 'UP')
    .catch(() => 'DOWN');

  res.json({
    message: 'API de MBIGUA SDP funcionando!',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    database: dbStatus,
    uptime: `${Math.floor(uptime / 60)} mins ${Math.floor(uptime % 60)} secs`,
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentsRoutes);


// Manejador de errores de multer
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      message: 'Error al procesar archivos',
      error: err.message,
      code: err.code,
    });
  }
  next(err);
});

// Manejador de rutas no encontradas
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Manejador global de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorResponse = {
    success: false,
    message: 'Error interno del servidor',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    Object.assign(errorResponse, {
      error: {
        message: err.message,
        stack: err.stack,
      },
    });
  }

  console.error('Error:', errorResponse);
  res.status(500).json(errorResponse);
});

// Iniciar servidor con manejo de errores
const server = app.listen(port, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`⚡️ Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Archivos: ${path.resolve('uploads')}`);
  console.log(`🌐 CORS: ${corsOptions.origin}`);
  console.log('='.repeat(50));
});

// Manejo graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });
});

// Manejo de promesas rechazadas no capturadas
process.on('unhandledRejection', (reason: Error) => {
  console.error('🔥 Error no manejado:', {
    message: reason.message,
    stack: reason.stack,
    timestamp: new Date().toISOString(),
  });
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error: Error) => {
  console.error('🔥 Excepción no capturada:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  server.close(() => {
    process.exit(1);
  });
});
