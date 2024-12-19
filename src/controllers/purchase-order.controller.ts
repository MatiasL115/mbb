// src/controllers/purchase-order.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// Interfaces
interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
    };
  };
}

interface OrderItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total?: number;
}

interface CreateOrderData {
  providerId: string;
  projectId: string;
  budgetItemId: string;
  number: string;
  date: string;
  description?: string;
  items: OrderItem[];
}

interface ApprovalData {
  comment?: string;
}

interface RejectionData {
  comment: string;
}

// GET /api/purchase-orders
export const getAll = async (req: RequestWithUser, res: Response) => {
  try {
    const { status, providerId, projectId, fromDate, toDate } = req.query;

    const where: any = {
      ...(status && { status: String(status) }),
      ...(providerId && { providerId: String(providerId) }),
      ...(projectId && { projectId: String(projectId) }),
      ...(fromDate && toDate && {
        date: {
          gte: new Date(String(fromDate)),
          lte: new Date(String(toDate))
        }
      })
    };

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rejectedBy: {
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

    // Calcular montos restantes para cada orden
    const ordersWithRemaining = orders.map(order => {
      const paidAmount = order.paymentRequests
        .filter(pr => pr.status === 'FINANCIAL_APPROVED')
        .reduce((sum, pr) => sum + Number(pr.amount), 0);
      
      return {
        ...order,
        remainingAmount: Number(order.totalAmount) - paidAmount
      };
    });

    res.json({
      success: true,
      data: ordersWithRemaining
    });
  } catch (error) {
    console.error('Get all purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes de compra',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/purchase-orders/:id
export const getById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rejectedBy: {
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

    // Calcular monto restante
    const paidAmount = order.paymentRequests
      .filter(pr => pr.status === 'FINANCIAL_APPROVED')
      .reduce((sum, pr) => sum + Number(pr.amount), 0);

    const orderWithRemaining = {
      ...order,
      remainingAmount: Number(order.totalAmount) - paidAmount
    };

    res.json({
      success: true,
      data: orderWithRemaining
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener orden de compra',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/purchase-orders/:id/approve
export const approve = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body as ApprovalData;

    // Verificar que la orden existe y está pendiente
    const order = await prisma.purchaseOrder.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'La orden no está pendiente de aprobación'
      });
    }

    // Aprobar la orden y registrar el historial
    const approvedOrder = await prisma.$transaction(async (prisma) => {
      // Actualizar estado de la orden
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: req.user.id,
          approvedAt: new Date(),
          approvalComment: comment?.trim() || null
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Registrar en historial si hay comentario
      if (comment?.trim()) {
        await prisma.purchaseOrderHistory.create({
          data: {
            orderId: id,
            userId: req.user.id,
            action: 'APPROVED',
            comment: comment.trim()
          }
        });
      }

      return updatedOrder;
    });

    res.json({
      success: true,
      data: approvedOrder,
      message: 'Orden aprobada correctamente'
    });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar la orden',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/purchase-orders/:id/reject
export const reject = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body as RejectionData;

    if (!comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El motivo del rechazo es requerido'
      });
    }

    // Verificar que la orden existe y está pendiente
    const order = await prisma.purchaseOrder.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden de compra no encontrada'
      });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'La orden no está pendiente de aprobación'
      });
    }

    // Rechazar la orden y registrar el historial
    const rejectedOrder = await prisma.$transaction(async (prisma) => {
      // Actualizar estado de la orden
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedById: req.user.id,
          rejectedAt: new Date(),
          rejectionComment: comment.trim()
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          rejectedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Registrar en historial
      await prisma.purchaseOrderHistory.create({
        data: {
          orderId: id,
          userId: req.user.id,
          action: 'REJECTED',
          comment: comment.trim()
        }
      });

      return updatedOrder;
    });

    res.json({
      success: true,
      data: rejectedOrder,
      message: 'Orden rechazada correctamente'
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la orden',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/purchase-orders/next-number
export const getNextNumber = async (req: Request, res: Response) => {
    try {
      const year = new Date().getFullYear();
      
      // Buscar la última orden del año
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
  
      // Generar el siguiente número
      let nextNumber;
      if (lastOrder) {
        const lastNumber = parseInt(lastOrder.number.split('-')[2]);
        nextNumber = `OC-${year}-${(lastNumber + 1).toString().padStart(4, '0')}`;
      } else {
        nextNumber = `OC-${year}-0001`;
      }
  
      res.json({
        success: true,
        data: {
          number: nextNumber
        }
      });
    } catch (error) {
      console.error('Get next number error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar siguiente número',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

// POST /api/purchase-orders
export const create = async (req: RequestWithUser, res: Response) => {
  try {
    const {
      providerId,
      projectId,
      budgetItemId,
      number,
      date,
      description,
      items
    }: CreateOrderData = req.body;

    // Validación de campos requeridos
    if (!providerId || !projectId || !budgetItemId || !items?.length || !number) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    // Verificar que el número no exista
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: { number }
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una orden con ese número'
      });
    }

    // Validar items
    if (!items.every(item => 
      item.description && 
      item.quantity > 0 && 
      item.unit && 
      item.unitPrice > 0)) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de los items son requeridos y los valores deben ser mayores a 0'
      });
    }

    // Calcular monto total con IVA incluido
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const totalAmount = subtotal * 1.1; // 10% IVA

    // Verificar saldo disponible
    const balance = await getBudgetItemBalance(budgetItemId);
    if (totalAmount > balance) {
      return res.status(400).json({
        success: false,
        message: 'El monto total excede el saldo disponible en la partida'
      });
    }

    // Verificar que el proyecto y proveedor existan y estén activos
    const [project, provider] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId }
      }),
      prisma.provider.findUnique({
        where: { id: providerId }
      })
    ]);

    if (!project || project.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'El proyecto no existe o no está activo'
      });
    }

    if (!provider || provider.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'El proveedor no existe o no está activo'
      });
    }

    const order = await prisma.$transaction(async (prisma) => {
      // Crear la orden
      const order = await prisma.purchaseOrder.create({
        data: {
          number,
          providerId,
          projectId,
          budgetItemId,
          date: new Date(date),
          totalAmount,
          status: 'PENDING',
          description,
          creatorId: req.user.id,
          items: {
            create: items.map((item: OrderItem) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit,
              unitPrice: Number(item.unitPrice),
              total: Number(item.quantity) * Number(item.unitPrice)
            }))
          }
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
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

      // Registrar transacción presupuestaria
      await prisma.budgetTransaction.create({
        data: {
          budgetItemId,
          amount: totalAmount,
          type: 'DEBIT',
          reference: order.number,
          description: `Orden de Compra ${order.number}`
        }
      });

      return order;
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Orden de compra creada exitosamente'
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden de compra',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/purchase-orders/:id/pdf
export const downloadPdf = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        items: true,
        creator: {
          select: {
            name: true
          }
        },
        approvedBy: {
          select: {
            name: true
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

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OC-${order.number}.pdf`);
    doc.pipe(res);

    generatePurchaseOrderPdf(doc, order);

    doc.end();
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/purchase-orders/export
export const exportToExcel = async (req: RequestWithUser, res: Response) => {
  try {
    const { fromDate, toDate, status } = req.query;

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(fromDate && toDate && {
          date: {
            gte: new Date(String(fromDate)),
            lte: new Date(String(toDate))
          }
        })
      },
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        items: true,
        paymentRequests: {
          where: {
            status: 'FINANCIAL_APPROVED'
          },
          select: {
            amount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Órdenes de Compra');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Número', key: 'number', width: 15 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Proveedor', key: 'provider', width: 30 },
      { header: 'Proyecto', key: 'project', width: 30 },
      { header: 'Partida', key: 'budgetItem', width: 30 },
      { header: 'Monto Total', key: 'totalAmount', width: 15 },
      { header: 'Monto Pagado', key: 'paidAmount', width: 15 },
      { header: 'Saldo', key: 'remainingAmount', width: 15 },
      { header: 'Estado', key: 'status', width: 12 }
    ];

    // Agregar datos
    orders.forEach(order => {
      const paidAmount = order.paymentRequests.reduce((sum, pr) => 
        sum + Number(pr.amount), 0);
      const remainingAmount = Number(order.totalAmount) - paidAmount;

      worksheet.addRow({
        number: order.number,
        date: order.date.toLocaleDateString(),
        provider: order.provider.name,
        project: order.project.name,
        budgetItem: order.budgetItem.name,
        totalAmount: Number(order.totalAmount).toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2),
        status: order.status
      });
    });

    // Dar formato a las columnas numéricas
    ['totalAmount', 'paidAmount', 'remainingAmount'].forEach(col => {
      worksheet.getColumn(col).numFmt = '"$"#,##0.00';
    });

    // Dar formato al encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ordenes-compra.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export to Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar a Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función auxiliar para calcular saldo de partida
const getBudgetItemBalance = async (budgetItemId: string): Promise<number> => {
  try {
    const budgetItem = await prisma.budgetItem.findUnique({
      where: { id: budgetItemId },
      include: {
        transactions: true
      }
    });

    if (!budgetItem) {
      throw new Error('Partida presupuestaria no encontrada');
    }

    const balance = budgetItem.transactions.reduce((sum, trans) => {
      return trans.type === 'CREDIT' 
        ? sum + Number(trans.amount)
        : sum - Number(trans.amount);
    }, Number(budgetItem.amount));

    return balance;
  } catch (error) {
    console.error('Error calculating budget balance:', error);
    throw error;
  }
};

// Función auxiliar para generar PDF
const generatePurchaseOrderPdf = (doc: PDFKit.PDFDocument, order: any) => {
  try {
    // Configuración inicial
    doc.font('Helvetica');
    
    // Encabezado
    doc.fontSize(20)
       .text('Orden de Compra', { align: 'center' });
    doc.moveDown();
    
    // Información de la orden
    doc.fontSize(12)
       .text(`Número: ${order.number}`)
       .text(`Fecha: ${order.date.toLocaleDateString()}`);
    doc.moveDown();
  
    // Información del proveedor
    doc.fontSize(14)
       .text('Datos del Proveedor', { underline: true });
    doc.fontSize(12)
       .text(`Nombre: ${order.provider.name}`)
       .text(`RUC: ${order.provider.ruc || 'N/A'}`)
       .text(`Dirección: ${order.provider.address || 'N/A'}`)
       .text(`Teléfono: ${order.provider.phone || 'N/A'}`);
    doc.moveDown();
  
    // Información del proyecto
    doc.fontSize(14)
       .text('Proyecto', { underline: true });
    doc.fontSize(12)
       .text(`Nombre: ${order.project.name}`)
       .text(`Partida: ${order.budgetItem.name}`);
    doc.moveDown();
  
    // Descripción si existe
    if (order.description) {
      doc.fontSize(14)
         .text('Descripción', { underline: true });
      doc.fontSize(12)
         .text(order.description);
      doc.moveDown();
    }
  
    // Tabla de items
    doc.fontSize(14)
       .text('Detalles', { underline: true });
    doc.moveDown();
  
    // Configuración de la tabla
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 350;
    const priceX = 400;
    const totalX = 480;
  
    // Cabeceras de la tabla
    doc.fontSize(11)
       .text('Descripción', itemX, tableTop)
       .text('Cant.', quantityX, tableTop)
       .text('Precio', priceX, tableTop)
       .text('Total', totalX, tableTop);
  
    doc.moveDown();
  
    // Línea separadora después de cabeceras
    const lineY = doc.y;
    doc.moveTo(itemX, lineY)
       .lineTo(totalX + 60, lineY)
       .stroke();
  
    doc.moveDown();
  
    // Items
    let y = doc.y;
    let subtotal = 0;
  
    order.items.forEach((item: any) => {
      // Nueva página si es necesario
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
  
      // Formatear números
      const unitPrice = Number(item.unitPrice).toLocaleString('es-PY', {
        style: 'currency',
        currency: 'PYG'
      });
      const total = Number(item.total).toLocaleString('es-PY', {
        style: 'currency',
        currency: 'PYG'
      });
  
      doc.fontSize(10)
         .text(item.description, itemX, y, { width: 290 })
         .text(item.quantity.toString(), quantityX, y)
         .text(unitPrice, priceX, y)
         .text(total, totalX, y);
  
      subtotal += Number(item.total);
      y += 20;
    });
  
    // Línea final de items
    doc.moveTo(itemX, y)
       .lineTo(totalX + 60, y)
       .stroke();
  
    y += 20;
  
    // Totales
    const iva = subtotal * 0.1;
    const total = subtotal + iva;
  
    // Formatear totales
    const subtotalFormatted = subtotal.toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG'
    });
    const ivaFormatted = iva.toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG'
    });
    const totalFormatted = total.toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG'
    });
  
    doc.fontSize(10)
       .text('Subtotal:', 400, y)
       .text(subtotalFormatted, totalX, y);
    
    y += 20;
    doc.text('IVA (10%):', 400, y)
       .text(ivaFormatted, totalX, y);
    
    y += 20;
    doc.fontSize(12)
       .text('Total:', 400, y, { bold: true })
       .text(totalFormatted, totalX, y, { bold: true });
  
    // Pie de página
    const bottomY = doc.page.height - 100;
  
    // Líneas para firmas
    doc.moveTo(50, bottomY)
       .lineTo(200, bottomY)
       .stroke();
    
    doc.moveTo(350, bottomY)
       .lineTo(500, bottomY)
       .stroke();
  
    // Textos del pie de página
    doc.fontSize(10)
       .text('Elaborado por', 50, bottomY + 10)
       .text(order.creator.name, 50, bottomY + 25);
  
    doc.text('Autorizado por', 350, bottomY + 10)
       .text(order.approvedBy?.name || '_____________________', 350, bottomY + 25);
  
    // Número de página
    const pageNumber = `Página ${doc.pageNumber}`;
    doc.fontSize(8)
       .text(
         pageNumber,
         doc.page.width - 100,
         doc.page.height - 50,
         { align: 'right' }
       );
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Exports
export {
  getAll,
  getById,
  create,
  approve,
  reject,
  getNextNumber,
  downloadPdf,
  exportToExcel
};