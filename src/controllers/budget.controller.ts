// src/controllers/budget.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
    };
  };
}

// Obtener items presupuestarios por projectId
export const getBudgetItemsByProjectId = async (req: RequestWithUser, res: Response) => {
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
      console.error('Error al obtener presupuestos por projectId:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener presupuestos asociados al proyecto',
      });
    }
  };

  
// Obtener todos los items presupuestarios
export const getBudgetItems = async (req: RequestWithUser, res: Response) => {
  try {
    const { projectId, status } = req.query;

    const items = await prisma.budgetItem.findMany({
      where: {
        ...(projectId && { projectId: String(projectId) }),
        ...(status && { status: String(status) })
      },
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
    console.error('Get budget items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener items presupuestarios'
    });
  }
};

// Obtener item por ID
export const getBudgetItemById = async (req: RequestWithUser, res: Response) => {
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
    console.error('Get budget item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener item presupuestario'
    });
  }
};

// Crear nuevo item
export const createBudgetItem = async (req: RequestWithUser, res: Response) => {
  try {
    const { projectId, name, code, description, amount } = req.body;

    // Validar que el código no exista
    const existingItem = await prisma.budgetItem.findUnique({
      where: { code }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un item con ese código'
      });
    }

    const item = await prisma.budgetItem.create({
      data: {
        projectId,
        name,
        code,
        description,
        amount: Number(amount),
        status: 'ACTIVE'
      },
      include: {
        project: true
      }
    });

    // Registrar transacción inicial
    await prisma.budgetTransaction.create({
      data: {
        budgetItemId: item.id,
        amount: Number(amount),
        type: 'CREDIT',
        reference: 'INITIAL',
        description: 'Asignación inicial'
      }
    });

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Create budget item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear item presupuestario'
    });
  }
};

// Actualizar item
export const updateBudgetItem = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, amount, status } = req.body;

    const item = await prisma.budgetItem.update({
      where: { id },
      data: {
        name,
        description,
        amount: amount ? Number(amount) : undefined,
        status
      },
      include: {
        project: true
      }
    });

    // Si cambió el monto, registrar la transacción
    if (amount) {
      await prisma.budgetTransaction.create({
        data: {
          budgetItemId: id,
          amount: Number(amount),
          type: 'CREDIT',
          reference: 'ADJUSTMENT',
          description: 'Ajuste de monto'
        }
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Update budget item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item presupuestario'
    });
  }
};

// Obtener saldo
export const getBudgetItemBalance = async (req: RequestWithUser, res: Response) => {
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
      if (trans.type === 'CREDIT') {
        return acc + Number(trans.amount);
      } else {
        return acc - Number(trans.amount);
      }
    }, 0);

    res.json({
      success: true,
      data: {
        balance,
        initialAmount: Number(item.amount)
      }
    });
  } catch (error) {
    console.error('Get budget balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener saldo presupuestario'
    });
  }
};

// Obtener transacciones
export const getBudgetTransactions = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const transactions = await prisma.budgetTransaction.findMany({
      where: {
        budgetItemId: id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.budgetTransaction.count({
      where: {
        budgetItemId: id
      }
    });

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
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones'
    });
  }
};