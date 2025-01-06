// src/types/budget.ts
import { Decimal } from '@prisma/client/runtime/library';

export interface BudgetTransactionCreate {
  budgetItemId: string;
  amount: Decimal | number;
  type: 'CREDIT' | 'DEBIT';
  reference: string;
  description?: string;
}

export interface BudgetItemCreate {
  projectId: string;
  name: string;
  code: string;
  description?: string;
  amount: Decimal | number;
}