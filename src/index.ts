import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

// Importación de rutas
import authRoutes from './routes/auth.routes';
import providerRoutes from './routes/provider.routes';
import paymentRequestRoutes from './routes/payment-request.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import reportsRoutes from './routes/reports.routes';

// Cargar variables de entorno
dotenv.config();

// Crear instancia de Express
const app = express();
const port = process.env.PORT || 3000;

// Configuración de multer para manejo de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Los archivos se guardarán en la carpeta uploads
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generamos un nombre único para cada archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB por archivo
    files: 10 // Máximo 10 archivos por solicitud
  },
  fileFilter: (req, file, cb) => {
    // Validación de tipos de archivo permitidos
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Middleware globales
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // URL del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsers para diferentes tipos de contenido
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Headers de seguridad
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Middleware de logging mejorado
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Agregamos logging de respuesta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Ruta de estado del servidor
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'API de MBIGUA SDP funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API con prefijo /api
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', reportsRoutes);

// Middleware para manejar errores de multer
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Error al procesar archivos',
      error: err.message
    });
  }
  next(err);
});

// Manejo de rutas no encontradas
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejo global de errores mejorado
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`⚡️ Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Archivos servidos desde: ${path.resolve('uploads')}`);
  console.log('='.repeat(50));
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: Error) => {
  console.error('🔥 Error no manejado:', {
    message: reason.message,
    stack: reason.stack,
    timestamp: new Date().toISOString()
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('🔥 Excepción no capturada:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

export default app;