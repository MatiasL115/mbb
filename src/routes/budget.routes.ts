// src/routes/budget.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { 
  getBudgetItems,
  getBudgetItemById,
  createBudgetItem,
  updateBudgetItem,
  getBudgetItemBalance,
  getBudgetTransactions,
  getBudgetItemsByProjectId,
} from '../controllers/budget.controller';

const router = Router();

router.use(authMiddleware);

// Rutas para items presupuestarios
router.get('/projects/:projectId/items', getBudgetItemsByProjectId);
router.get('/items', getBudgetItems);
router.get('/items/:id', getBudgetItemById);
router.post('/items', createBudgetItem);
router.put('/items/:id', updateBudgetItem);
router.get('/items/:id/balance', getBudgetItemBalance);
router.get('/items/:id/transactions', getBudgetTransactions);

export default router;