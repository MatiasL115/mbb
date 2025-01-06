// src/types/numbers.ts
import { Prisma } from '@prisma/client';

export const toDecimal = (value: number | string): Prisma.Decimal => {
  return new Prisma.Decimal(value.toString());
};

export const fromDecimal = (decimal: Prisma.Decimal): number => {
  return decimal.toNumber();
};