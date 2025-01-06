import { Router } from 'express';
import {
  getBanks,
  createBank,
  updateBank,
  getAccountsByBank,
  createBankAccount,
  getAccountById,
  getMovementsByAccount,
  getCheckbooksByAccount,
  createMovementForAccount,
  createCheckbookForAccount,
  reconcileMovement,
} from '../controllers/bank.controller';

const router = Router();

router.get('/', getBanks);
router.post('/', createBank);
router.put('/:id', updateBank);

router.get('/:bankId/accounts', getAccountsByBank);
router.post('/accounts', createBankAccount);
router.get('/accounts/:accountId', getAccountById);

// Movimientos
router.get('/accounts/:accountId/movements', getMovementsByAccount);
router.post('/accounts/:accountId/movements', createMovementForAccount);

// Chequeras
router.get('/accounts/:accountId/checkbooks', getCheckbooksByAccount);
router.post('/accounts/:accountId/checkbooks', createCheckbookForAccount);

// Conciliación
router.post('/accounts/:accountId/reconcile', reconcileMovement);

export default router;
