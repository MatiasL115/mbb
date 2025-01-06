import { Request, Response } from 'express';
import dayjs from 'dayjs';
import prisma from '../config/prisma';

// Si quieres el formato local español, puedes hacer:
// import 'dayjs/locale/es';
// dayjs.locale('es');

export const createProvider = async (req: Request, res: Response) => {
  try {
    const { 
      name,
      ruc,
      address,
      phone,
      email,
      contactInfo,
      bankInfo
    } = req.body;

    // Solo validamos el nombre
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del proveedor es obligatorio'
      });
    }

    // Si se proporciona RUC, verificamos que no exista y sea único
    if (ruc) {
      const existingProvider = await prisma.provider.findUnique({
        where: { ruc: ruc.trim() }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con este RUC'
        });
      }
    }

    // Validar email si se proporciona
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    const provider = await prisma.provider.create({
      data: {
        name: name.trim(),
        ruc: ruc?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim()?.toLowerCase() || null,
        contactInfo: contactInfo ? JSON.parse(JSON.stringify(contactInfo)) : null,
        bankInfo: bankInfo ? JSON.parse(JSON.stringify(bankInfo)) : null,
        status: 'ACTIVE',
      }
    });

    res.status(201).json({
      success: true,
      data: provider,
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Create provider error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear el proveedor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getProviders = async (req: Request, res: Response) => {
  try {
    const { search, status, orderBy = 'name' } = req.query;

    const where: any = {
      // Por defecto traemos proveedores con status 'ACTIVE'
      status: (status as string) || 'ACTIVE',
    };

    if (search) {
      const s = String(search);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { ruc: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } }
      ];
    }

    // Obtenemos los proveedores (sin límite) para calcular estadísticas
    const providersRaw = await prisma.provider.findMany({
      where,
      orderBy: { [String(orderBy)]: 'asc' },
      include: {
        purchaseOrders: {
          select: {
            status: true,
            totalAmount: true,
            createdAt: true
          }
        },
        paymentRequests: {
          select: {
            status: true,
            amount: true
          }
        }
      }
    });

    // Calculamos las estadísticas "stats" para cada proveedor
    const providers = providersRaw.map((provider) => {
      // 1) Parseamos bankInfo y contactInfo si vienen como strings
      let parsedBankInfo = null;
      if (provider.bankInfo) {
        parsedBankInfo = typeof provider.bankInfo === 'string'
          ? JSON.parse(provider.bankInfo)
          : provider.bankInfo;
      }

      let parsedContactInfo = null;
      if (provider.contactInfo) {
        parsedContactInfo = typeof provider.contactInfo === 'string'
          ? JSON.parse(provider.contactInfo)
          : provider.contactInfo;
      }

      // 2) Órdenes "activas" => status === 'APPROVED'
      const activeOrders = provider.purchaseOrders.filter(po =>
        po.status === 'APPROVED'
      ).length;

      // 3) Órdenes completadas => status === 'COMPLETED'
      const completedOrders = provider.purchaseOrders.filter(po =>
        po.status === 'COMPLETED'
      ).length;

      // 4) Monto total
      const totalAmount = provider.purchaseOrders.reduce(
        (acc, po) => acc + Number(po.totalAmount),
        0
      );

      // 5) Fecha de última orden
      let lastOrderDateRaw: Date | null = null;
      if (provider.purchaseOrders.length > 0) {
        lastOrderDateRaw = provider.purchaseOrders.reduce((latest, po) => {
          return !latest || po.createdAt > latest ? po.createdAt : latest;
        }, null as Date | null);
      }

      const lastOrderDate = lastOrderDateRaw
        ? dayjs(lastOrderDateRaw).format('DD/MM/YYYY HH:mm:ss')
        : 'N/A';

      // 6) Métricas de PaymentRequests
      const completedPayments = provider.paymentRequests.filter(pr =>
        pr.status === 'COMPLETED'
      ).length;

      const totalPaymentAmount = provider.paymentRequests
        .filter(pr => pr.status === 'COMPLETED')
        .reduce((acc, pr) => acc + Number(pr.amount), 0);

      // 7) Retornamos el objeto final, con bankInfo/contactInfo parseados
      return {
        ...provider,
        bankInfo: parsedBankInfo,
        contactInfo: parsedContactInfo,
        stats: {
          activeOrders,
          completedOrders,
          totalAmount,
          lastOrderDate,
          completedPayments,
          totalPaymentAmount
        }
      };
    });

    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get providers error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los proveedores',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1) Traemos TODOS los purchaseOrders/paymentRequests del proveedor
    const fullProvider = await prisma.provider.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true }
        },
        paymentRequests: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            purchaseOrders: true,
            paymentRequests: true
          }
        }
      }
    });

    if (!fullProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // 2) Parsear bankInfo y contactInfo
    let parsedBankInfo = null;
    if (fullProvider.bankInfo) {
      parsedBankInfo = typeof fullProvider.bankInfo === 'string'
        ? JSON.parse(fullProvider.bankInfo)
        : fullProvider.bankInfo;
    }

    let parsedContactInfo = null;
    if (fullProvider.contactInfo) {
      parsedContactInfo = typeof fullProvider.contactInfo === 'string'
        ? JSON.parse(fullProvider.contactInfo)
        : fullProvider.contactInfo;
    }

    // 3) Calculamos estadísticas
    const activeOrders = fullProvider.purchaseOrders.filter(po =>
      po.status === 'APPROVED'
    ).length;

    const completedOrders = fullProvider.purchaseOrders.filter(po =>
      po.status === 'COMPLETED'
    ).length;

    const totalAmount = fullProvider.purchaseOrders.reduce(
      (acc, po) => acc + Number(po.totalAmount),
      0
    );

    let lastOrderDateRaw: Date | null = null;
    if (fullProvider.purchaseOrders.length > 0) {
      lastOrderDateRaw = fullProvider.purchaseOrders.reduce((latest, po) => {
        return !latest || po.createdAt > latest ? po.createdAt : latest;
      }, null as Date | null);
    }

    const lastOrderDate = lastOrderDateRaw
      ? dayjs(lastOrderDateRaw).format('DD/MM/YYYY HH:mm:ss')
      : 'N/A';

    const completedPayments = fullProvider.paymentRequests.filter(pr =>
      pr.status === 'COMPLETED'
    ).length;

    const totalPaymentAmount = fullProvider.paymentRequests
      .filter(pr => pr.status === 'COMPLETED')
      .reduce((acc, pr) => acc + Number(pr.amount), 0);

    // 4) Opcional: solo 5 últimas órdenes/pagos
    const limitedPurchaseOrders = fullProvider.purchaseOrders.slice(0, 5);
    const limitedPaymentRequests = fullProvider.paymentRequests.slice(0, 5);

    // 5) Construimos el objeto final
    const provider = {
      ...fullProvider,
      bankInfo: parsedBankInfo,
      contactInfo: parsedContactInfo,
      purchaseOrders: limitedPurchaseOrders,
      paymentRequests: limitedPaymentRequests,
      stats: {
        activeOrders,
        completedOrders,
        totalAmount,
        lastOrderDate,
        completedPayments,
        totalPaymentAmount
      }
    };

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get provider error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el proveedor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const updateProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      phone,
      email,
      contactInfo,
      bankInfo
    } = req.body;

    const existingProvider = await prisma.provider.findUnique({
      where: { id }
    });

    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede estar vacío'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    const updateData: any = {
      name: name?.trim() || undefined,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim()?.toLowerCase() || null
    };

    if (contactInfo) {
      updateData.contactInfo = JSON.parse(JSON.stringify(contactInfo));
    }

    if (bankInfo) {
      updateData.bankInfo = JSON.parse(JSON.stringify(bankInfo));
    }

    const providerUpdated = await prisma.provider.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: providerUpdated,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Update provider error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el proveedor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const deleteProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const providerWithRelations = await prisma.provider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            paymentRequests: true
          }
        }
      }
    });

    if (!providerWithRelations) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Si tiene órdenes o solicitudes vinculadas, lo marcamos INACTIVE
    if (
      providerWithRelations._count.purchaseOrders > 0 ||
      providerWithRelations._count.paymentRequests > 0
    ) {
      await prisma.provider.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      return res.json({
        success: true,
        message: 'Proveedor marcado como inactivo'
      });
    }

    // Si no tiene relaciones, se elimina por completo
    await prisma.provider.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Proveedor eliminado correctamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Delete provider error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el proveedor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Podrías eliminar (o modificar) esto si ya no lo usas
export const getProviderStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stats = await prisma.provider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            paymentRequests: true
          }
        },
        purchaseOrders: {
          select: {
            totalAmount: true,
            status: true
          }
        },
        paymentRequests: {
          select: {
            amount: true,
            status: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Ejemplo de cálculo de stats
    const totalOrders = stats._count.purchaseOrders;
    const totalPayments = stats._count.paymentRequests;
    const totalAmount = stats.purchaseOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const paidAmount = stats.paymentRequests
      .filter(payment => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalPayments,
        totalAmount,
        paidAmount,
        pendingAmount: totalAmount - paidAmount
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get provider stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del proveedor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export default {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
  getProviderStats
};
