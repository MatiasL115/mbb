// src/controllers/reports.controller.ts
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

export const getDashboardStats = async (req: RequestWithUser, res: Response) => {
  try {
    const [
      totalPaymentRequests,
      pendingRequests,
      approvedRequests,
      totalOrders,
      activeProviders,
      monthlySummary
    ] = await Promise.all([
      // Total de solicitudes
      prisma.paymentRequest.count(),
      
      // Solicitudes pendientes
      prisma.paymentRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Solicitudes aprobadas
      prisma.paymentRequest.count({
        where: { status: 'FINANCIAL_APPROVED' }
      }),
      
      // Total de órdenes
      prisma.purchaseOrder.count(),
      
      // Proveedores activos
      prisma.provider.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Resumen mensual
      prisma.paymentRequest.groupBy({
        by: ['status'],
        _sum: {
          amount: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPaymentRequests,
        pendingRequests,
        approvedRequests,
        totalOrders,
        activeProviders,
        monthlySummary
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

export const getPaymentRequestsReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;

    const requests = await prisma.paymentRequest.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(String(startDate)),
            lte: new Date(String(endDate))
          }
        })
      },
      include: {
        provider: true,
        requester: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const summary = {
      totalAmount: requests.reduce((sum, req) => sum + Number(req.amount), 0),
      totalCount: requests.length,
      byStatus: requests.reduce((acc: any, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {}),
      byProvider: requests.reduce((acc: any, req) => {
        acc[req.provider.name] = (acc[req.provider.name] || 0) + Number(req.amount);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        requests,
        summary
      }
    });
  } catch (error) {
    console.error('Get payment requests report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de solicitudes'
    });
  }
};

export const getPurchaseOrdersReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(String(startDate)),
            lte: new Date(String(endDate))
          }
        })
      },
      include: {
        provider: true,
        items: true
      }
    });

    const summary = {
      totalAmount: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
      totalCount: orders.length,
      byStatus: orders.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      byProvider: orders.reduce((acc: any, order) => {
        acc[order.provider.name] = (acc[order.provider.name] || 0) + Number(order.totalAmount);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        orders,
        summary
      }
    });
  } catch (error) {
    console.error('Get purchase orders report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte de órdenes de compra'
    });
  }
};