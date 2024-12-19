// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      pendingRequests,
      technicalApprovals,
      financialApprovals,
      activeOrders,
      monthlyAmount,
      activeProviders,
      recentRequests,
      alerts
    ] = await Promise.all([
      // Solicitudes pendientes
      prisma.paymentRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Aprobaciones técnicas pendientes
      prisma.paymentRequest.count({
        where: { status: 'PENDING', type: 'TECHNICAL_REVIEW' }
      }),
      
      // Aprobaciones financieras pendientes
      prisma.paymentRequest.count({
        where: { status: 'TECHNICAL_APPROVED' }
      }),
      
      // Órdenes activas
      prisma.purchaseOrder.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Monto total del mes
      prisma.paymentRequest.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Proveedores activos
      prisma.provider.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Solicitudes recientes
      prisma.paymentRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: { name: true }
          }
        }
      }),
      
      // Alertas
      Promise.all([
        // Solicitudes pendientes > 48h
        prisma.paymentRequest.count({
          where: {
            status: 'PENDING',
            createdAt: {
              lte: new Date(Date.now() - 48 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Órdenes próximas a vencer
        prisma.purchaseOrder.count({
          where: {
            status: 'ACTIVE',
            dueDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ])
    ]);

    const [overdueRequests, dueSoonOrders] = alerts;

    res.json({
      success: true,
      data: {
        stats: {
          solicitudesPendientes: pendingRequests,
          aprobacionesTecnicas: technicalApprovals,
          aprobacionesFinancieras: financialApprovals,
          ordenesActivas: activeOrders,
          montoMensual: monthlyAmount._sum.amount || 0,
          proveedoresActivos: activeProviders
        },
        solicitudesRecientes: recentRequests.map(req => ({
          id: req.id,
          numero: req.number,
          proveedor: req.provider.name,
          monto: Number(req.amount),
          estado: req.status,
          fecha: req.createdAt
        })),
        alertas: {
          solicitudesVencidas: overdueRequests,
          ordenesProximasVencer: dueSoonOrders
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del dashboard'
    });
  }
};