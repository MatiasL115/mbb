// src/routes/category.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import CategoryController from '../controllers/category.controller';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas de categorías
router.get('/', CategoryController.getAllCategories);
router.post('/', CategoryController.createCategory);
router.get('/:id', CategoryController.getCategory);
router.put('/:id', CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

// Rutas de subcategorías
router.post('/:categoryId/subcategories', CategoryController.createSubcategory);

export default router;