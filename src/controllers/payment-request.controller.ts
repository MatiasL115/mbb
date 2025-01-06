// src/controllers/payment-request.controller.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createPaymentRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const {
      providerId,
      amount,
      type,           // DIRECT, WITH_PO, PARTIAL
      description,
      paymentType,    // contado, diferido
      paymentTerm,
      paymentDate,
      purchaseOrderId,

      // IMPORTANTE: si quieres asociar la solicitud a un BudgetItem
      // (ya tienes budgetItemId en el schema).
      budgetItemId,

      // Si en tu schema también incluyes projectId en PaymentRequest,
      // podrías leerlo y guardarlo aquí. Pero por defecto, PaymentRequest
      // no tiene projectId, solo budgetItemId (que a su vez se relaciona con Project).
      // projectId,
    } = req.body;

    // Validaciones mínimas
    const validationErrors: string[] = [];
    if (!providerId) validationErrors.push('providerId es requerido');
    if (!amount) validationErrors.push('amount es requerido');
    if (!type) validationErrors.push('type es requerido');

    // Si type === 'DIRECT', podrías exigir que budgetItemId no sea null
    if ((type === 'DIRECT') && !budgetItemId) {
      validationErrors.push('budgetItemId es requerido para solicitudes DIRECT');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos',
        errors: validationErrors
      });
    }

    // Verificar si existe el proveedor
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Verificar la orden de compra si corresponde
    if ((type === 'WITH_PO' || type === 'PARTIAL') && purchaseOrderId) {
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId }
      });

      if (!purchaseOrder) {
        return res.status(400).json({
          success: false,
          message: 'Orden de compra no encontrada'
        });
      }

      // (Opcional) Validar saldo de OC, si tu modelo lo maneja:
      // if (Number(amount) > purchaseOrder.remainingAmount) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'El monto excede el saldo disponible en la orden de compra'
      //   });
      // }
    }

    // Generar número secuencial: SDP-YYYY-XXX
    const year = new Date().getFullYear();
    const lastRequest = await prisma.paymentRequest.findFirst({
      where: {
        number: {
          startsWith: `SDP-${year}`
        }
      },
      orderBy: {
        number: 'desc'
      }
    });

    let number;
    if (lastRequest) {
      const lastNumber = parseInt(lastRequest.number.split('-')[2]);
      number = `SDP-${year}-${(lastNumber + 1).toString().padStart(3, '0')}`;
    } else {
      number = `SDP-${year}-001`;
    }

    // Crear la solicitud de pago
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        number,
        providerId,
        amount: Number(amount),
        type,
        description: description || '',
        status: 'PENDING',
        requesterId: req.user.id,
        purchaseOrderId: purchaseOrderId || null,
        paymentType: paymentType || 'contado',
        paymentTerm: paymentType === 'diferido' ? paymentTerm : null,
        paymentDate: paymentType === 'diferido' && paymentDate ? new Date(paymentDate) : null,

        // AQUI GUARDAMOS EL budgetItemId
        budgetItemId: budgetItemId || null,

        // Solo si en tu schema agregaste un campo projectId en PaymentRequest:
        // projectId: projectId || null,
      },
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        purchaseOrder: true
      }
    });

    // Manejar archivos adjuntos
    console.log('Archivos adjuntos:', req.files);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        await prisma.paymentRequestAttachment.create({
          data: {
            paymentRequestId: paymentRequest.id,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path
            // fieldName: file.fieldname, // opcional si lo deseas
          }
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: paymentRequest,
      message: 'Solicitud creada exitosamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en createPaymentRequest:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al crear solicitud de pago',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getPaymentRequests = async (req: Request, res: Response) => {
  try {
    const { status, type, startDate, endDate, providerId } = req.query;

    const where: any = {};
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (providerId) where.providerId = String(providerId);

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const requests = await prisma.paymentRequest.findMany({
      where,
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        purchaseOrder: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getPaymentRequests:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getPaymentRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        technicalApprover: {
          select: { id: true, name: true, email: true }
        },
        financialApprover: {
          select: { id: true, name: true, email: true }
        },
        purchaseOrder: true,
        // Incluir adjuntos
        PaymentRequestAttachment: true,
        // Incluir budgetItem + project
        budgetItem: {
          include: { project: true }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    return res.json({
      success: true,
      data: request
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getPaymentRequestById:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const approveTechnical = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { comment } = req.body;

    if (req.user.role.name !== 'TECHNICAL_APPROVER' && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción'
      });
    }

    const currentRequest = await prisma.paymentRequest.findUnique({
      where: { id }
    });

    if (!currentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (currentRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud no está en estado pendiente'
      });
    }

    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'TECHNICAL_APPROVED',
        technicalApprover: {
          connect: { id: req.user.id }
        },
        technicalApprovalDate: new Date(),
        technicalApprovalComment: comment || null
      },
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        technicalApprover: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json({
      success: true,
      data: request,
      message: 'Solicitud aprobada técnicamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en approveTechnical:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al aprobar solicitud',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const approveFinancial = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { comment, paymentDetails } = req.body;

    if (req.user.role.name !== 'FINANCIAL_APPROVER' && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción'
      });
    }

    const currentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        technicalApprover: true,
        financialApprover: true
      }
    });

    if (!currentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (currentRequest.status !== 'TECHNICAL_APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'La solicitud debe tener aprobación técnica primero'
      });
    }

    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'FINANCIAL_APPROVED',
        financialApprover: {
          connect: { id: req.user.id }
        },
        financialApprovalDate: new Date(),
        financialApprovalComment: comment || null,
        paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null
      },
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        financialApprover: {
          select: { id: true, name: true, email: true }
        },
        technicalApprover: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json({
      success: true,
      data: request,
      message: 'Solicitud aprobada financieramente'
    });
  } catch (error) {
    const err = error as Error & { code?: string; details?: string };
    console.error('Error detallado en approveFinancial:', {
      error: err,
      stack: err.stack,
      message: err.message,
      code: err.code
    });

    return res.status(500).json({
      success: false,
      message: 'Error al aprobar solicitud',
      error: process.env.NODE_ENV === 'development'
        ? {
            message: err.message,
            code: err.code,
            details: err.details
          }
        : undefined
    });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'El comentario es requerido para rechazar una solicitud'
      });
    }

    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionComment: comment,
        rejectedAt: new Date(),
        rejectedBy: {
          connect: { id: req.user.id }
        }
      },
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        rejectedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json({
      success: true,
      data: request,
      message: 'Solicitud rechazada'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en rejectRequest:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { role } = req.user;
    let where: any;

    // Filtrar según el rol del usuario
    if (role.name === 'TECHNICAL_APPROVER') {
      where = { status: 'PENDING' };
    } else if (role.name === 'FINANCIAL_APPROVER') {
      where = { status: 'TECHNICAL_APPROVED' };
    } else {
      // Por defecto, si es ADMIN u otro rol
      where = { status: 'PENDING' };
    }

    const requests = await prisma.paymentRequest.findMany({
      where,
      include: {
        provider: true,
        requester: {
          select: { id: true, name: true, email: true }
        },
        technicalApprover: {
          select: { id: true, name: true, email: true }
        },
        financialApprover: {
          select: { id: true, name: true, email: true }
        },
        purchaseOrder: true,
        rejectedBy: {
          select: { id: true, name: true, email: true }
        },
        // Incluir adjuntos
        PaymentRequestAttachment: true,
        // Incluir budgetItem + project
        budgetItem: {
          include: {
            project: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getPendingRequests:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes pendientes',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Exportar todo como objeto
export default {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  approveTechnical,
  approveFinancial,
  rejectRequest,
  getPendingRequests
};
