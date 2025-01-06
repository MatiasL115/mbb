// src/services/invoice.service.ts

import prisma from '../config/prisma';
import {
  CreateInvoiceDTO,
  InvoiceFilters,
  PaymentDTO,
  ApiResponse,
  Invoice,
  InvoicePayment,
  Document
} from '../types/invoice.types';
import { PaymentType, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid'; // Para generar paymentId en InvoicePayment, si es obligatorio

export class InvoiceService {
  /**
   * Crea una nueva factura.
   */
  async create(data: CreateInvoiceDTO): Promise<ApiResponse<Invoice>> {
    try {
      // Verificar si ya existe una factura con el mismo número
      const existingInvoice = await prisma.invoice.findUnique({
        where: { number: data.number }
      });

      if (existingInvoice) {
        return {
          success: false,
          error: 'Ya existe una factura con este número'
        };
      }

      // Normalizar el paymentType a un enum de Prisma
      const paymentTypeValue: PaymentType = data.paymentType
        ? (data.paymentType.toUpperCase() as PaymentType)
        : PaymentType.CASH; // Valor por defecto (CASH)

      // Crear la nueva factura
      const invoice = await prisma.invoice.create({
        data: {
          number: data.number,
          date: new Date(data.date),
          clientId: data.clientId,
          projectId: data.projectId || null, // permitir null
          paymentType: paymentTypeValue,
          paymentTerm: data.paymentTerm !== undefined ? data.paymentTerm : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: InvoiceStatus.DRAFT,
          observations: data.observations ?? null,
          items: {
            create: data.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice
            }))
          }
        },
        include: {
          client: true,
          project: true,
          items: true,
          payments: true,
          documents: true
        }
      });

      return { success: true, data: invoice };
    } catch (error) {
      const err = error as Error;
      console.error('Error creating invoice:', err);
      return {
        success: false,
        error: 'No se pudo crear la factura',
        message: err.message
      };
    }
  }

  /**
   * Obtiene listado de facturas con filtros opcionales.
   */
  async getAll(filters?: InvoiceFilters): Promise<ApiResponse<Invoice[]>> {
    try {
      const where: any = {};

      // Filtrar por status
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status.toUpperCase();
      }

      // Filtrar por projectId
      if (filters?.projectId && filters.projectId !== 'all') {
        where.projectId = filters.projectId;
      }

      // Filtrar por clientId
      if (filters?.clientId) {
        where.clientId = filters.clientId;
      }

      // Búsqueda por texto (número o nombre de cliente)
      if (filters?.search) {
        where.OR = [
          { number: { contains: filters.search, mode: 'insensitive' } },
          {
            client: {
              name: { contains: filters.search, mode: 'insensitive' }
            }
          }
        ];
      }

      // Filtro de fechas
      if (filters?.startDate && filters?.endDate) {
        where.date = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          client: true,
          project: true,
          items: true,
          payments: true,
          documents: true
        },
        orderBy: {
          date: 'desc'
        }
      });

      return {
        success: true,
        data: invoices,
        message: `Se encontraron ${invoices.length} facturas`
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching invoices:', err);
      return {
        success: false,
        error: 'No se pudieron obtener las facturas',
        message: err.message
      };
    }
  }

  /**
   * Obtiene una factura por ID, con sus relaciones.
   */
  async getById(id: string): Promise<ApiResponse<Invoice>> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          project: true,
          items: true,
          payments: true,
          documents: true
        }
      });

      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }

      return { success: true, data: invoice };
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching invoice:', err);
      return {
        success: false,
        error: 'No se pudo obtener la factura',
        message: err.message
      };
    }
  }

  /**
   * Actualiza campos de la factura, siempre que no esté pagada por completo.
   */
  async update(
    id: string,
    data: Partial<CreateInvoiceDTO>
  ): Promise<ApiResponse<Invoice>> {
    try {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payments: true,
          items: true,
          client: true,
          project: true,
          documents: true
        }
      });

      if (!existingInvoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }

      // No permitir actualizar facturas con status = 'PAID'
      if (existingInvoice.status === 'PAID') {
        return {
          success: false,
          error: 'No se puede actualizar una factura pagada'
        };
      }

      // Construir objeto con campos actualizables
      const updatedData: any = {};

      if (data.number) updatedData.number = data.number;
      if (data.date) updatedData.date = new Date(data.date);
      if (data.clientId) updatedData.clientId = data.clientId;
      if (data.projectId !== undefined) {
        updatedData.projectId = data.projectId || null;
      }
      if (data.paymentType) {
        updatedData.paymentType = data.paymentType.toUpperCase() as PaymentType;
      }
      if (data.paymentTerm !== undefined) {
        updatedData.paymentTerm = data.paymentTerm;
      }
      if (data.dueDate) {
        updatedData.dueDate = new Date(data.dueDate);
      }
      if (data.observations !== undefined) {
        updatedData.observations = data.observations ?? null;
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updatedData,
        include: {
          client: true,
          project: true,
          items: true,
          payments: true,
          documents: true
        }
      });

      return { success: true, data: invoice };
    } catch (error) {
      const err = error as Error;
      console.error('Error updating invoice:', err);
      return {
        success: false,
        error: 'No se pudo actualizar la factura',
        message: err.message
      };
    }
  }

  /**
   * Registra un pago en la factura, y actualiza el status según el monto pagado.
   * NOTA: En tu schema, "InvoicePayment" exige paymentId => Generamos uno con uuidv4().
   */
  async registerPayment(
    id: string,
    paymentData: PaymentDTO
  ): Promise<ApiResponse<InvoicePayment>> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payments: true,
          items: true
        }
      });

      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }

      if (invoice.status === 'PAID') {
        return {
          success: false,
          error: 'La factura ya está pagada completamente'
        };
      }

      // Normalizar paymentMethod
      const paymentMethodValue: PaymentMethod = paymentData.paymentMethod
        ? (paymentData.paymentMethod.toUpperCase() as PaymentMethod)
        : PaymentMethod.CASH;

      const payment = await prisma.$transaction(async (prismaTx) => {
        // Crear el pago
        // AGREGAMOS paymentId: uuidv4()
        const newPayment = await prismaTx.invoicePayment.create({
          data: {
            paymentId: uuidv4(), // importante si tu schema lo exige
            invoiceId: id,
            amount: paymentData.amount,
            paymentDate: new Date(paymentData.paymentDate),
            paymentMethod: paymentMethodValue,
            reference: paymentData.reference || null,
            observations: paymentData.observations || null
          }
        });

        // Calcular total pagado
        const totalPaid =
          invoice.payments.reduce((sum, p) => sum + p.amount, 0) +
          paymentData.amount;

        // Calcular total de la factura
        const invoiceTotal = invoice.items.reduce(
          (sum, item) => sum + (item.total || 0),
          0
        );

        // Actualizar el status según el total pagado
        await prismaTx.invoice.update({
          where: { id },
          data: {
            status: totalPaid >= invoiceTotal ? 'PAID' : 'PARTIAL'
          }
        });

        return newPayment;
      });

      return {
        success: true,
        data: payment,
        message: 'Pago registrado correctamente'
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error registering payment:', err);
      return {
        success: false,
        error: 'No se pudo registrar el pago',
        message: err.message
      };
    }
  }

  /**
   * Sube un documento adjunto a la factura.
   * NOTA: En tu schema "Document" exige 'size' y 'mimeType' => los agregamos.
   */
  async uploadDocument(
    id: string,
    file: Express.Multer.File
  ): Promise<ApiResponse<Document>> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id }
      });

      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }

      // Crear registro de documento en la BD (agregamos size y mimeType obligatorios)
      const document = await prisma.document.create({
        data: {
          invoiceId: id,
          name: file.originalname,
          path: file.path,
          type: 'OTHER',          // Ajusta si necesitas otro 'type'
          size: file.size,        // file.size (bytes)
          mimeType: file.mimetype // p.ej. 'application/pdf'
        }
      });

      return {
        success: true,
        data: document,
        message: 'Documento subido correctamente'
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error uploading document:', err);
      return {
        success: false,
        error: 'No se pudo subir el documento',
        message: err.message
      };
    }
  }

  /**
   * Genera el próximo número de factura (ejemplo: F20230001, etc).
   */
  async getNextNumber(): Promise<ApiResponse<string>> {
    try {
      const currentYear = new Date().getFullYear();

      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          number: {
            startsWith: `F${currentYear}`
          }
        },
        orderBy: {
          number: 'desc'
        }
      });

      let nextNumber: string;
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.number.slice(-4));
        nextNumber = `F${currentYear}${(lastNumber + 1)
          .toString()
          .padStart(4, '0')}`;
      } else {
        nextNumber = `F${currentYear}0001`;
      }

      return {
        success: true,
        data: nextNumber
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error generating next number:', err);
      return {
        success: false,
        error: 'No se pudo generar el siguiente número de factura',
        message: err.message
      };
    }
  }
}

// Exporta una sola instancia del servicio
const invoiceService = new InvoiceService();
export default invoiceService;
