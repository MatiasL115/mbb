import { Request, Response } from 'express';
import prisma from '../config/prisma';

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
        where: { ruc }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con este RUC'
        });
      }
    }

    // Validar email si se proporciona
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    // Creamos el proveedor con todos los campos opcionales
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
    console.error('Create provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el proveedor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getProviders = async (req: Request, res: Response) => {
  try {
    const { search, status, orderBy = 'name' } = req.query;

    const where = {
      status: status as string || 'ACTIVE',
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { ruc: { contains: search as string } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ]
      })
    };

    const providers = await prisma.provider.findMany({
      where,
      orderBy: { [orderBy as string]: 'asc' },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            paymentRequests: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: providers,
      count: providers.length
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los proveedores'
    });
  }
};

export const getProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true
          }
        },
        paymentRequests: {
          take: 5,
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

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    res.json({
      success: true,
      data: provider
    });

  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el proveedor'
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

    // Solo validamos el nombre si se está actualizando
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre no puede estar vacío'
      });
    }

    // Validar email si se proporciona
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del email no es válido'
      });
    }

    const updateData = {
      name: name?.trim() || undefined,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      contactInfo: contactInfo ? JSON.parse(JSON.stringify(contactInfo)) : undefined,
      bankInfo: bankInfo ? JSON.parse(JSON.stringify(bankInfo)) : undefined,
    };

    const provider = await prisma.provider.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: provider,
      message: 'Proveedor actualizado exitosamente'
    });

  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el proveedor'
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

    // Soft delete si tiene relaciones
    if (providerWithRelations._count.purchaseOrders > 0 || 
        providerWithRelations._count.paymentRequests > 0) {
      await prisma.provider.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      return res.json({
        success: true,
        message: 'Proveedor marcado como inactivo'
      });
    }

    // Hard delete si no tiene relaciones
    await prisma.provider.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Proveedor eliminado correctamente'
    });

  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el proveedor'
    });
  }
};

// Método adicional para obtener estadísticas agregadas
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

    const totalOrders = stats._count.purchaseOrders;
    const totalPayments = stats._count.paymentRequests;
    const totalAmount = stats.purchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidAmount = stats.paymentRequests
      .filter(payment => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + payment.amount, 0);

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
    console.error('Get provider stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del proveedor'
    });
  }
};