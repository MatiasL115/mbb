// src/controllers/purchase-order.controller.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createHash } from 'crypto';

// Eliminamos las interfaces locales no necesarias, ya que Request extiende globalmente para tener req.user tipo AuthUser

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

/** Colores de marca o los que prefieras **/
const LATORRE_BLUE = '#0059B3';
const LATORRE_LIGHT_BLUE = '#E6ECFA';
const LATORRE_DARK_GRAY = '#505050';
const LATORRE_DARKER_BLUE = '#00478F';

// ===============================
// Funciones Auxiliares
// ===============================
const getBudgetItemBalance = async (budgetItemId: string): Promise<number> => {
  try {
    const budgetItem = await prisma.budgetItem.findUnique({
      where: { id: budgetItemId },
      include: { transactions: true }
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

/** 
 * Genera la "firma digital" usando datos clave de la orden. 
 * Ajusta según tu lógica de negocio.
 */
function generateDigitalSignature(order: any): string {
  const baseString = [
    order.number,
    order.date,
    order.provider?.name || '',
    order.project?.name || '',
    order.totalAmount
  ].join('|');

  const hash = createHash('sha256').update(baseString).digest('hex');
  return hash.slice(0, 16); // 16 caracteres
}

/**
 * Nueva versión de la función para generar el PDF con PDFKit,
 * usando colores de marca, tabla de ítems, firma digital, etc.
 */
function generatePurchaseOrderPdfBetter(doc: PDFKit.PDFDocument, order: any) {
  try {
    doc.font('Helvetica');
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Encabezado en azul con texto blanco
    doc
      .rect(0, 0, pageWidth, 60)
      .fill(LATORRE_BLUE);

    doc
      .fillColor('white')
      .fontSize(18)
      .text('Orden de Compra', 0, 20, { align: 'center' });

    // Restablecemos color y fuente para contenido
    doc.fillColor('black').fontSize(12);
    doc.y = 80;  // bajamos la posición vertical
    doc.x = 50;  // margen izquierdo

    // Datos principales
    doc
      .fontSize(14)
      .fillColor(LATORRE_DARKER_BLUE)
      .text(`Número: ${order.number}`, { continued: true })
      .fillColor(LATORRE_DARK_GRAY)
      .text(`  |  Fecha: ${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}`);

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('black')
       .text('Datos del Proveedor', { underline: true });
    doc.moveDown(0.3);

    const provider = order.provider || {};
    doc
      .text(`Nombre: ${provider.name || 'N/A'}`)
      .text(`RUC: ${provider.ruc || 'N/A'}`)
      .text(`Dirección: ${provider.address || 'N/A'}`)
      .text(`Teléfono: ${provider.phone || 'N/A'}`)
      .moveDown(0.8);

    doc
      .fontSize(10)
      .fillColor('black')
      .text('Proyecto', { underline: true });
    doc.moveDown(0.3);

    const project = order.project || {};
    const budgetItem = order.budgetItem || {};
    doc
      .text(`Nombre: ${project.name || 'N/A'}`)
      .text(`Partida: ${budgetItem.name || 'N/A'}`)
      .moveDown(0.8);

    // Descripción
    if (order.description) {
      doc
        .fontSize(10)
        .fillColor('black')
        .text('Descripción', { underline: true });
      doc.moveDown(0.3);
      doc.text(order.description).moveDown(0.8);
    }

    // Sección de ítems
    doc
      .fontSize(10)
      .fillColor(LATORRE_DARKER_BLUE)
      .text('Detalles de los Ítems', { underline: true });
    doc.moveDown(0.5);

    const itemX = 50;
    const quantityX = 320;
    const priceX = 380;
    const totalX = 450;
    const lineHeight = 16;
    let currentY = doc.y;

    // Cabecera “tabla”
    doc
      .rect(itemX - 5, currentY - 2, pageWidth - (itemX + 50), lineHeight + 4)
      .fill(LATORRE_LIGHT_BLUE);

    doc.fillColor('black').fontSize(10);
    doc.text('Descripción', itemX, currentY);
    doc.text('Cant.', quantityX, currentY);
    doc.text('Precio', priceX, currentY);
    doc.text('Total', totalX, currentY);

    currentY += lineHeight;
    doc
      .moveTo(itemX - 5, currentY)
      .lineTo(pageWidth - 50, currentY)
      .stroke();

    doc.fillColor('black');
    let subtotal = 0;

    (order.items || []).forEach((item: any) => {
      // Control de salto de página manual
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 50;
      }
      currentY += 4;

      // formateo de montos
      const unitPrice = Number(item.unitPrice).toLocaleString('es-PY', {
        style: 'currency',
        currency: 'PYG'
      });
      const itemTotal = Number(item.total).toLocaleString('es-PY', {
        style: 'currency',
        currency: 'PYG'
      });

      doc.text(item.description, itemX, currentY, { width: quantityX - itemX - 5 });
      doc.text(String(item.quantity || ''), quantityX, currentY);
      doc.text(unitPrice, priceX, currentY);
      doc.text(itemTotal, totalX, currentY);

      currentY += lineHeight;
      doc
        .moveTo(itemX - 5, currentY)
        .lineTo(pageWidth - 50, currentY)
        .strokeColor(LATORRE_LIGHT_BLUE)
        .stroke();

      subtotal += Number(item.total) || 0;
    });

    currentY += 10;
    const subtotalFormatted = subtotal.toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG'
    });
    const totalFormatted = subtotalFormatted; // no sumamos IVA

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('black')
      .text('Subtotal:', priceX, currentY)
      .text(subtotalFormatted, totalX, currentY, { align: 'left' });

    currentY += lineHeight;
    doc
      .text('Total:', priceX, currentY)
      .text(totalFormatted, totalX, currentY, { align: 'left' });
    doc.font('Helvetica');

    // Firma digital
    const digitalSignature = generateDigitalSignature(order);
    currentY += 40;
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = 50;
    }
    doc
      .fontSize(8)
      .fillColor(LATORRE_DARK_GRAY)
      .text(`Firma Digital: ${digitalSignature}`, 50, currentY);
    doc.text(
      'Esta firma digital verifica la autenticidad de este documento.',
      50,
      currentY + 12
    );

    // Firmas
    currentY += 40;
    doc
      .moveTo(50, currentY)
      .lineTo(200, currentY)
      .strokeColor('black')
      .stroke();

    doc
      .moveTo(320, currentY)
      .lineTo(470, currentY)
      .stroke();

    currentY += 5;
    doc
      .fontSize(10)
      .fillColor('black')
      .text('Elaborado por', 50, currentY)
      .text(order.creator?.name || '____________________', 50, currentY + 15);

    doc
      .text('Autorizado por', 320, currentY)
      .text(order.approvedBy?.name || '____________________', 320, currentY + 15);

  } catch (error) {
    console.error('Error generating PDF (improved):', error);
    throw error;
  }
}

// ===============================
// CONTROLADORES
// ===============================

// GET /api/purchase-orders
const getAll = async (req: Request, res: Response) => {
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
        creator: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
        items: true,
        paymentRequests: {
          select: { id: true, number: true, status: true, amount: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const ordersWithRemaining = orders.map(order => {
      const paidAmount = order.paymentRequests
        .filter(pr => pr.status === 'FINANCIAL_APPROVED')
        .reduce((sum, pr) => sum + Number(pr.amount), 0);

      return {
        ...order,
        remainingAmount: Number(order.totalAmount) - paidAmount
      };
    });

    res.json({ success: true, data: ordersWithRemaining });
  } catch (error) {
    const err = error as Error;
    console.error('Get all purchase orders error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes de compra',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /api/purchase-orders/:id
const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        creator: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
        items: true,
        paymentRequests: {
          include: {
            requester: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    const paidAmount = order.paymentRequests
      .filter(pr => pr.status === 'FINANCIAL_APPROVED')
      .reduce((sum, pr) => sum + Number(pr.amount), 0);

    const orderWithRemaining = {
      ...order,
      remainingAmount: Number(order.totalAmount) - paidAmount
    };

    res.json({ success: true, data: orderWithRemaining });
  } catch (error) {
    const err = error as Error;
    console.error('Get purchase order error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener orden de compra',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// POST /api/purchase-orders
const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const {
      providerId,
      projectId,
      budgetItemId,
      number,
      date,
      description,
      items
    }: CreateOrderData = req.body;

    if (!providerId || !projectId || !budgetItemId || !items?.length || !number || !date) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    const existingOrder = await prisma.purchaseOrder.findFirst({ where: { number } });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una orden con ese número'
      });
    }

    if (!items.every(item => item.description && item.quantity > 0 && item.unit && item.unitPrice > 0)) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de los items son requeridos y deben ser mayores a 0'
      });
    }

    // Lógica para no sumar IVA
    const subtotal = items.reduce((sum: number, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalAmount = subtotal;

    const balance = await getBudgetItemBalance(budgetItemId);
    if (totalAmount > balance) {
      return res.status(400).json({
        success: false,
        message: 'El monto total excede el saldo disponible en la partida'
      });
    }

    const [project, provider] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.provider.findUnique({ where: { id: providerId } })
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

    const userId = req.user.id;

    const order = await prisma.$transaction(async (prismaTx) => {
      const createdOrder = await prismaTx.purchaseOrder.create({
        data: {
          number,
          providerId,
          projectId,
          budgetItemId,
          date: new Date(date),
          totalAmount,
          status: 'PENDING',
          description,
          creatorId: userId,
          items: {
            create: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice
            }))
          }
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
          creator: { select: { id: true, name: true, email: true } },
          items: true
        }
      });

      await prismaTx.budgetTransaction.create({
        data: {
          budgetItemId,
          amount: totalAmount,
          type: 'DEBIT',
          reference: createdOrder.number,
          description: `Orden de Compra ${createdOrder.number}`
        }
      });

      return createdOrder;
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Orden de compra creada exitosamente'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Create purchase order error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear orden de compra',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /api/purchase-orders/:id/pdf
const downloadPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        budgetItem: true,
        items: true,
        creator: { select: { name: true } },
        approvedBy: { select: { name: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    // Creamos el doc PDF y lo enviamos en la respuesta
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OC-${order.number}.pdf`);
    doc.pipe(res);

    // Llamamos a la función MEJORADA
    generatePurchaseOrderPdfBetter(doc, order);

    doc.end();
  } catch (error) {
    const err = error as Error;
    console.error('Download PDF error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /api/purchase-orders/next-number
const getNextNumber = async (req: Request, res: Response) => {
  try {
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

    let nextNumber;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.number.split('-')[2]);
      nextNumber = `OC-${year}-${(lastNum + 1).toString().padStart(4, '0')}`;
    } else {
      nextNumber = `OC-${year}-0001`;
    }

    res.json({
      success: true,
      data: { number: nextNumber }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get next number error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al generar siguiente número',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// POST /api/purchase-orders/:id/approve
const approve = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { comment } = req.body as ApprovalData;

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'La orden no está pendiente de aprobación'
      });
    }

    const userId = req.user.id; // user está definido en req.user

    const approvedOrder = await prisma.$transaction(async (prismaTx) => {
      const updatedOrder = await prismaTx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          approvalComment: comment?.trim() || null
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
          creator: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } }
        }
      });

      if (comment?.trim()) {
        await prismaTx.purchaseOrderHistory.create({
          data: {
            orderId: id,
            userId: userId,
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
    const err = error as Error;
    console.error('Approve order error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar la orden',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// POST /api/purchase-orders/:id/reject
const reject = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { comment } = req.body as RejectionData;

    if (!comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El motivo del rechazo es requerido'
      });
    }

    const order = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'La orden no está pendiente de aprobación'
      });
    }

    const userId = req.user.id;

    const rejectedOrder = await prisma.$transaction(async (prismaTx) => {
      const updatedOrder = await prismaTx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionComment: comment.trim()
        },
        include: {
          provider: true,
          project: true,
          budgetItem: true,
          creator: { select: { id: true, name: true, email: true } },
          rejectedBy: { select: { id: true, name: true, email: true } }
        }
      });

      await prismaTx.purchaseOrderHistory.create({
        data: {
          orderId: id,
          userId: userId,
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
    const err = error as Error;
    console.error('Reject order error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la orden',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /api/purchase-orders/export
const exportToExcel = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, status } = req.query;

    const where: any = {
      ...(status && { status: String(status) }),
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
        items: true,
        paymentRequests: {
          where: { status: 'FINANCIAL_APPROVED' },
          select: { amount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Órdenes de Compra');

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

    orders.forEach(order => {
      const paidAmount = order.paymentRequests.reduce((sum, pr) => sum + Number(pr.amount), 0);
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

    ['totalAmount', 'paidAmount', 'remainingAmount'].forEach(col => {
      worksheet.getColumn(col).numFmt = '"$"#,##0.00';
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ordenes-compra.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    const err = error as Error;
    console.error('Export to Excel error:', err);
    res.status(500).json({
      success: false,
      message: 'Error al exportar a Excel',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

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
