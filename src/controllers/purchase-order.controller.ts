// src/controllers/purchase-order.controller.ts
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

export const createPurchaseOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const { providerId, items, description } = req.body;

    // Generar número secuencial (OC-2024-001)
    const year = new Date().getFullYear();
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: {
        number: {
          startsWith: `OC-${year}`
        }
      },
      orderBy: {
        number: 'desc'
      }
    });

    let number;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.number.split('-')[2]);
      number = `OC-${year}-${(lastNumber + 1).toString().padStart(3, '0')}`;
    } else {
      number = `OC-${year}-001`;
    }

    // Calcular monto total
    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        number,
        providerId,
        totalAmount,
        status: 'PENDING',
        description,
        creatorId: req.user.id,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        }
      },
      include: {
        provider: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: true
      }
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden de compra'
    });
  }
};

export const getPurchaseOrders = async (req: RequestWithUser, res: Response) => {
  try {
    const { status, providerId } = req.query;

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(providerId && { providerId: String(providerId) })
      },
      include: {
        provider: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: true,
        paymentRequests: {
          select: {
            id: true,
            number: true,
            status: true,
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes de compra'
    });
  }
};

export const getPurchaseOrderById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        provider: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: true,
        paymentRequests: {
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener orden de compra'
    });
  }
};