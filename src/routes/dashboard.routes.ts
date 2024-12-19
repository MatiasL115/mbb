// src/routes/dashboard.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);
router.get('/stats', dashboardController.getDashboardStats);

export default router;