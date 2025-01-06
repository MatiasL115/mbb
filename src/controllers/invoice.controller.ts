// src/controllers/invoice.controller.ts
import { Request, Response } from 'express';
import invoiceService from '../services/invoice.service';
import { CreateInvoiceDTO, InvoiceFilters, PaymentDTO } from '../types/invoice.types';

export const createInvoice = async (req: Request, res: Response) => {
  try {
    console.log('Creating invoice:', req.body);
    
    const response = await invoiceService.create(req.body as CreateInvoiceDTO);
    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: response.error || 'Error al crear la factura',
        details: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in createInvoice controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const filters: InvoiceFilters = {
      search: req.query.search as string,
      status: req.query.status as string,
      clientId: req.query.clientId as string,
      projectId: req.query.projectId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    console.log('Getting invoices with filters:', filters);

    const response = await invoiceService.getAll(filters);
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in getInvoices controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Getting invoice by id:', id);

    const response = await invoiceService.getById(id);
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(404).json({
        success: false,
        error: response.error || 'Factura no encontrada',
        message: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in getInvoiceById controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Updating invoice:', id, req.body);

    const response = await invoiceService.update(id, req.body as Partial<CreateInvoiceDTO>);
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: response.error || 'Error al actualizar la factura',
        message: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in updateInvoice controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const registerPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Registering payment for invoice:', id, req.body);

    const response = await invoiceService.registerPayment(id, req.body as PaymentDTO);
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: response.error || 'Error al registrar el pago',
        message: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in registerPayment controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }

    console.log('Uploading document for invoice:', id, file.originalname);

    const response = await invoiceService.uploadDocument(id, file);
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: response.error || 'Error al subir el documento',
        message: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in uploadDocument controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getNextNumber = async (req: Request, res: Response) => {
  try {
    const response = await invoiceService.getNextNumber();
    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: response.error || 'Error al generar número de factura',
        message: response.message
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error in getNextNumber controller:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  registerPayment,
  uploadDocument,
  getNextNumber
};
