// src/controllers/budget.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { handleError } from '../utils/error-Handler';

// Obtener items presupuestarios por projectId
export const getBudgetItemsByProjectId = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const items = await prisma.budgetItem.findMany({
      where: { projectId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron presupuestos asociados a este proyecto',
      });
    }

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Error al obtener presupuestos por projectId:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al obtener presupuestos asociados al proyecto',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Obtener todos los items presupuestarios
export const getBudgetItems = async (req: Request, res: Response) => {
  try {
    const { projectId, status } = req.query;

    const where: Prisma.BudgetItemWhereInput = {
      ...(projectId && { projectId: String(projectId) }),
      ...(status && { status: String(status) })
    };

    const items = await prisma.budgetItem.findMany({
      where,
      include: {
        project: true,
        _count: {
          select: {
            purchaseOrders: true,
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Get budget items error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al obtener items presupuestarios',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Obtener item por ID
export const getBudgetItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.budgetItem.findUnique({
      where: { id },
      include: {
        project: true,
        transactions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item presupuestario no encontrado'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Get budget item error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al obtener item presupuestario',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Crear nuevo item
export const createBudgetItem = async (req: Request, res: Response) => {
  try {
    const { projectId, name, code, description, amount } = req.body;

    // Validar que el código no exista
    const existingItem = await prisma.budgetItem.findFirst({
      where: { code }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un item con ese código'
      });
    }

    const item = await prisma.$transaction(async (prisma) => {
      const newItem = await prisma.budgetItem.create({
        data: {
          projectId,
          name,
          code,
          description,
          amount: new Prisma.Decimal(amount),
          status: 'ACTIVE'
        },
        include: {
          project: true
        }
      });

      // Registrar transacción inicial
      await prisma.budgetTransaction.create({
        data: {
          budgetItemId: newItem.id,
          amount: new Prisma.Decimal(amount),
          type: 'CREDIT',
          reference: 'INITIAL',
          description: 'Asignación inicial'
        }
      });

      return newItem;
    });

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Create budget item error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al crear item presupuestario',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Actualizar item
export const updateBudgetItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, amount, status } = req.body;

    const updateData: Prisma.BudgetItemUpdateInput = {
      name,
      description,
      status,
      ...(amount && { amount: new Prisma.Decimal(amount) })
    };

    const item = await prisma.$transaction(async (prisma) => {
      const updatedItem = await prisma.budgetItem.update({
        where: { id },
        data: updateData,
        include: {
          project: true
        }
      });

      // Si cambió el monto, registrar la transacción
      if (amount) {
        await prisma.budgetTransaction.create({
          data: {
            budgetItemId: id,
            amount: new Prisma.Decimal(amount),
            type: 'CREDIT',
            reference: 'ADJUSTMENT',
            description: 'Ajuste de monto'
          }
        });
      }

      return updatedItem;
    });

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Update budget item error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item presupuestario',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Obtener saldo
export const getBudgetItemBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.budgetItem.findUnique({
      where: { id },
      include: {
        transactions: true
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item presupuestario no encontrado'
      });
    }

    const balance = item.transactions.reduce((acc, trans) => {
      const amount = trans.amount as unknown as Prisma.Decimal;
      if (trans.type === 'CREDIT') {
        return acc.plus(amount);
      } else {
        return acc.minus(amount);
      }
    }, new Prisma.Decimal(0));

    res.json({
      success: true,
      data: {
        balance: balance.toString(),
        initialAmount: item.amount.toString()
      }
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Get budget balance error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al obtener saldo presupuestario',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Obtener transacciones
export const getBudgetTransactions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const [transactions, total] = await Promise.all([
      prisma.budgetTransaction.findMany({
        where: {
          budgetItemId: id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.budgetTransaction.count({
        where: {
          budgetItemId: id
        }
      })
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('Get transactions error:', errorMessage);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};