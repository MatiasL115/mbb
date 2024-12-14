import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Extendemos la interfaz Request para incluir el usuario autenticado
interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
    };
  };
}

export const createPaymentRequest = async (req: RequestWithUser, res: Response) => {
  try {
    console.log('Recibiendo solicitud de creación:', req.body);
    
    // Extraemos todos los campos necesarios del body
    const { 
      providerId, 
      amount, 
      type, 
      description,
      paymentType,
      paymentTerm,
      paymentDate,
      purchaseOrderId
    } = req.body;

    // Realizamos validaciones básicas de campos requeridos
    const validationErrors: string[] = [];
    if (!providerId) validationErrors.push('providerId es requerido');
    if (!amount) validationErrors.push('amount es requerido');
    if (!type) validationErrors.push('type es requerido');

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Faltan campos requeridos',
        errors: validationErrors
      });
    }

    // Validar que el proveedor existe
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      return res.status(400).json({ 
        success: false,
        message: 'Proveedor no encontrado' 
      });
    }

    // Si es un pago relacionado con OC, validar que exista
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

      // Validar monto disponible en OC si es necesario
      if (purchaseOrder.remainingAmount < Number(amount)) {
        return res.status(400).json({
          success: false,
          message: 'El monto excede el saldo disponible en la orden de compra'
        });
      }
    }

    // Generar número secuencial para la solicitud
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

    // Crear la solicitud de pago con todos los campos
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
        paymentDate: paymentType === 'diferido' && paymentDate ? new Date(paymentDate) : null
      },
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        purchaseOrder: true
      }
    });

    // Si hay archivos adjuntos, procesarlos
    if (req.files?.length) {
      // Aquí iría la lógica para manejar los archivos
      console.log('Archivos adjuntos:', req.files);
    }

    console.log('Solicitud creada exitosamente:', paymentRequest);

    res.status(201).json({
      success: true,
      data: paymentRequest,
      message: 'Solicitud creada exitosamente'
    });
  } catch (error) {
    console.error('Error en createPaymentRequest:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al crear solicitud de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPaymentRequests = async (req: RequestWithUser, res: Response) => {
  try {
    // Extraemos los parámetros de filtrado
    const { status, type, startDate, endDate, providerId } = req.query;
    
    // Construimos el objeto de filtros
    const where: any = {};
    
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (providerId) where.providerId = String(providerId);
    
    // Filtro por fechas si se proporcionan
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    // Obtener las solicitudes con los filtros aplicados
    const requests = await prisma.paymentRequest.findMany({
      where,
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        purchaseOrder: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error en getPaymentRequests:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener solicitudes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPaymentRequestById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicalApprover: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        financialApprover: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        purchaseOrder: true
      }
    });

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Solicitud no encontrada' 
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error en getPaymentRequestById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const approveTechnical = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Verificar permisos del usuario
    if (req.user.role.name !== 'TECHNICAL_APPROVER' && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ 
        success: false,
        message: 'No tiene permisos para realizar esta acción' 
      });
    }

    // Verificar que la solicitud existe y está en estado pendiente
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

    // Aprobar técnicamente la solicitud
    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'TECHNICAL_APPROVED',
        technicalApproverId: req.user.id,
        technicalApprovalDate: new Date(),
        technicalApprovalComment: comment
      },
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Aquí podrías agregar lógica para enviar notificaciones

    res.json({
      success: true,
      data: request,
      message: 'Solicitud aprobada técnicamente'
    });
  } catch (error) {
    console.error('Error en approveTechnical:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al aprobar solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const approveFinancial = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { comment, paymentDetails } = req.body;

    // Verificar permisos del usuario
    if (req.user.role.name !== 'FINANCIAL_APPROVER' && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ 
        success: false,
        message: 'No tiene permisos para realizar esta acción' 
      });
    }

    // Verificar que la solicitud existe y tiene aprobación técnica
    const currentRequest = await prisma.paymentRequest.findUnique({
      where: { id }
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

    // Aprobar financieramente la solicitud
    const request = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'FINANCIAL_APPROVED',
        financialApproverId: req.user.id,
        financialApprovalDate: new Date(),
        financialApprovalComment: comment,
        paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null
      },
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Aquí podrías agregar lógica para enviar notificaciones

    res.json({
      success: true,
      data: request,
      message: 'Solicitud aprobada financieramente'
    });
  } catch (error) {
    console.error('Error en approveFinancial:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al aprobar solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const rejectRequest = async (req: RequestWithUser, res: Response) => {
  try {
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
        rejectedById: req.user.id
      },
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: request,
      message: 'Solicitud rechazada'
    });
  } catch (error) {
    console.error('Error en rejectRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPendingRequests = async (req: RequestWithUser, res: Response) => {
  try {
    const { role } = req.user;
    let where: any = { status: 'PENDING' };

    // Filtrar según el rol del usuario
    if (role.name === 'TECHNICAL_APPROVER') {
      where = { status: 'PENDING' };
    } else if (role.name === 'FINANCIAL_APPROVER') {
      where = { status: 'TECHNICAL_APPROVED' };
    }

    const requests = await prisma.paymentRequest.findMany({
      where,
      include: {
        provider: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error en getPendingRequests:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes pendientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequestById,
  approveTechnical,
  approveFinancial,
  rejectRequest,
  getPendingRequests
};