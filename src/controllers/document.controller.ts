// src/controllers/document.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';
import dayjs from 'dayjs';

// ===============================
//  1) PURCHASE INVOICE (Factura Recibida)
// ===============================

/**
 * Crea una nueva factura recibida (PurchaseInvoice).
 */
export const createPurchaseInvoice = async (req: Request, res: Response) => {
  try {
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      notes
      // ... cualquier otro campo que necesites
    } = req.body;

    // Validaciones mínimas
    if (!number?.trim() || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: number, issueDate'
      });
    }

    const purchaseInvoice = await prisma.purchaseInvoice.create({
      data: {
        number: number.trim(),
        date: dayjs(issueDate).toDate(),
        providerId: providerId || null,
        projectId: projectId || null,
        // En tu formulario se llama "amount", 
        // pero en PurchaseInvoice el campo es "total"
        total: amount ? parseFloat(amount) : 0,
        observations: notes?.trim() || null,
        status: 'PENDING'
      }
    });

    return res.status(201).json({
      success: true,
      data: purchaseInvoice,
      message: 'Factura recibida creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear factura recibida:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la factura recibida',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Obtiene la lista de facturas recibidas.
 */
export const getPurchaseInvoices = async (req: Request, res: Response) => {
  try {
    // Si quieres filtrar por proveedor, etc., aquí
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      orderBy: { date: 'desc' },
      include: {
        provider: true,
        project: true,
        invoicePayments: true
      }
    });

    return res.json({
      success: true,
      data: purchaseInvoices
    });
  } catch (error) {
    console.error('Error al obtener facturas recibidas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las facturas recibidas',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Obtiene el detalle de una factura recibida.
 */
export const getPurchaseInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        invoicePayments: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura recibida no encontrada'
      });
    }

    return res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error al obtener factura recibida:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la factura recibida',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Actualiza una factura recibida.
 */
export const updatePurchaseInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      notes,
      status
    } = req.body;

    const existing = await prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Factura recibida no encontrada'
      });
    }

    const updated = await prisma.purchaseInvoice.update({
      where: { id },
      data: {
        number: number?.trim() || existing.number,
        date: issueDate ? dayjs(issueDate).toDate() : existing.date,
        providerId: providerId ?? existing.providerId,
        projectId: projectId ?? existing.projectId,
        total: amount !== undefined ? parseFloat(amount) : existing.total,
        observations: notes?.trim() ?? existing.observations,
        status: status || existing.status
      }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Factura recibida actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar factura recibida:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la factura recibida',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Elimina o marca como inactiva una factura recibida.
 */
export const deletePurchaseInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Podrías hacer borrado lógico si ya tiene pagos asociados,
    // en este ejemplo haremos borrado físico:
    await prisma.purchaseInvoice.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Factura recibida eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar factura recibida:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la factura recibida',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

// ===============================
//  2) PURCHASE CREDIT NOTE (Nota de Crédito)
// ===============================

/**
 * Crea una nueva nota de crédito (PurchaseCreditNote).
 */
export const createCreditNote = async (req: Request, res: Response) => {
  try {
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      reason,
      notes,
      relatedInvoiceNumber
    } = req.body;

    if (!number?.trim() || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: number, issueDate'
      });
    }

    // Si en tu schema la nota de crédito es "PurchaseCreditNote" con un "total" y un "purchaseInvoiceId"
    // y/o un "reason"
    const creditNote = await prisma.purchaseCreditNote.create({
      data: {
        number: number.trim(),
        date: dayjs(issueDate).toDate(),
        providerId: providerId || null,
        projectId: projectId || null,
        total: amount ? parseFloat(amount) : 0,
        reason: reason?.trim() || null,
        observations: notes?.trim() || null,
        // Si deseas vincular la nota de crédito a una factura recibida por "relatedInvoiceNumber":
        // primero obtén la ID de la PurchaseInvoice correspondiente
        // Aquí te muestro un ejemplo rápido, ajusta según tu lógica
        purchaseInvoice: relatedInvoiceNumber
          ? {
              connect: { number: relatedInvoiceNumber.trim() }
            }
          : undefined
      }
    });

    return res.status(201).json({
      success: true,
      data: creditNote,
      message: 'Nota de crédito creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear nota de crédito:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la nota de crédito',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Lista notas de crédito.
 */
export const getCreditNotes = async (req: Request, res: Response) => {
  try {
    const creditNotes = await prisma.purchaseCreditNote.findMany({
      orderBy: { date: 'desc' },
      include: {
        provider: true,
        project: true,
        purchaseInvoice: true // Si quieres ver a qué factura recibida está ligada
      }
    });

    return res.json({
      success: true,
      data: creditNotes
    });
  } catch (error) {
    console.error('Error al obtener notas de crédito:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las notas de crédito',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Detalle de una nota de crédito.
 */
export const getCreditNoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const creditNote = await prisma.purchaseCreditNote.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true,
        purchaseInvoice: true
      }
    });

    if (!creditNote) {
      return res.status(404).json({
        success: false,
        message: 'Nota de crédito no encontrada'
      });
    }

    return res.json({
      success: true,
      data: creditNote
    });
  } catch (error) {
    console.error('Error al obtener nota de crédito:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la nota de crédito',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Actualiza una nota de crédito.
 */
export const updateCreditNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      reason,
      notes,
      relatedInvoiceNumber
    } = req.body;

    const existing = await prisma.purchaseCreditNote.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Nota de crédito no encontrada'
      });
    }

    let invoiceConnectOrDisconnect = {};
    if (relatedInvoiceNumber) {
      invoiceConnectOrDisconnect = {
        purchaseInvoice: {
          connect: { number: relatedInvoiceNumber.trim() }
        }
      };
    } else {
      // Si deseas "desconectar" la factura anterior, podrías hacer:
      invoiceConnectOrDisconnect = {
        purchaseInvoice: {
          disconnect: true
        }
      };
    }

    const updated = await prisma.purchaseCreditNote.update({
      where: { id },
      data: {
        number: number?.trim() || existing.number,
        date: issueDate ? dayjs(issueDate).toDate() : existing.date,
        providerId: providerId ?? existing.providerId,
        projectId: projectId ?? existing.projectId,
        total: amount !== undefined ? parseFloat(amount) : existing.total,
        reason: reason?.trim() ?? existing.reason,
        observations: notes?.trim() ?? existing.observations,
        ...invoiceConnectOrDisconnect
      }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Nota de crédito actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar nota de crédito:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la nota de crédito',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Elimina una nota de crédito.
 */
export const deleteCreditNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.purchaseCreditNote.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Nota de crédito eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar nota de crédito:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la nota de crédito',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

// ===============================
//  3) PURCHASE RECEIPT (Recibo)
// ===============================

/**
 * Crea un nuevo recibo (PurchaseReceipt).
 */
export const createReceipt = async (req: Request, res: Response) => {
  try {
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      concept,
      notes,
      // Ejemplo de campos extra que tienes en el form
      paymentMethod,
      referenceNumber
    } = req.body;

    if (!number?.trim() || !issueDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: number, issueDate'
      });
    }

    const receipt = await prisma.purchaseReceipt.create({
      data: {
        number: number.trim(),
        date: dayjs(issueDate).toDate(),
        providerId: providerId || null,
        projectId: projectId || null,
        total: amount ? parseFloat(amount) : 0,
        status: 'ACTIVE',
        observations: notes?.trim() || null
        // Si quieres guardar el "concept", "paymentMethod", "referenceNumber",
        // agrégalos a tu modelo purchaseReceipt con los nombres que desees
      }
    });

    return res.status(201).json({
      success: true,
      data: receipt,
      message: 'Recibo creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear recibo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el recibo',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Obtiene la lista de recibos.
 */
export const getReceipts = async (req: Request, res: Response) => {
  try {
    const receipts = await prisma.purchaseReceipt.findMany({
      orderBy: { date: 'desc' },
      include: {
        provider: true,
        project: true
      }
    });

    return res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los recibos',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Detalle de un recibo.
 */
export const getReceiptById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const receipt = await prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        provider: true,
        project: true
      }
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Recibo no encontrado'
      });
    }

    return res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error al obtener recibo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el recibo',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Actualiza un recibo.
 */
export const updateReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      number,
      issueDate,
      providerId,
      projectId,
      amount,
      notes
      // etc.
    } = req.body;

    const existing = await prisma.purchaseReceipt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Recibo no encontrado'
      });
    }

    const updated = await prisma.purchaseReceipt.update({
      where: { id },
      data: {
        number: number?.trim() || existing.number,
        date: issueDate ? dayjs(issueDate).toDate() : existing.date,
        providerId: providerId ?? existing.providerId,
        projectId: projectId ?? existing.projectId,
        total: amount !== undefined ? parseFloat(amount) : existing.total,
        observations: notes?.trim() ?? existing.observations
      }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Recibo actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar recibo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el recibo',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};

/**
 * Elimina un recibo.
 */
export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.purchaseReceipt.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Recibo eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar recibo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el recibo',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
};
