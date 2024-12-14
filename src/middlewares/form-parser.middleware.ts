import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configuración de multer para manejar archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite por archivo
    files: 10 // máximo 10 archivos
  }
});

// Middleware para procesar el form-data
export const formParser = (req: Request, res: Response, next: NextFunction) => {
  upload.array('files')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'Error al procesar archivos',
        error: err.message
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error interno al procesar formulario',
        error: err.message
      });
    }

    // Si hay datos JSON en el campo 'data', parsearlo
    if (req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data);
        req.body = { ...parsedData, files: req.files };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Error al parsear datos JSON',
          error: error.message
        });
      }
    }

    next();
  });
};