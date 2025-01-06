// src/routes/finance.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  registerPayment
} from '../controllers/finance.controller';
import { getBanks } from '../controllers/bank.controller';
import { getAll as getProjects } from '../controllers/project.controller';

const router = Router();

// Primero: el usuario debe estar autenticado
router.use(authMiddleware);

// Segundo: el usuario debe tener rol FINANCIAL_APPROVER
router.use(roleMiddleware(['FINANCIAL_APPROVER']));

// Loan routes
router.post('/loans', createLoan);
router.get('/loans', getLoans);
router.get('/loans/:id', getLoanById);
router.put('/loans/:id', updateLoan);
router.post('/loans/:id/payments', registerPayment);

// Additional routes
router.get('/banks', getBanks);
router.get('/projects', getProjects);

export default router;
