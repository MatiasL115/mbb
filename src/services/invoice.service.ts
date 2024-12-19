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

export class InvoiceService {
  async create(data: CreateInvoiceDTO): Promise<ApiResponse<Invoice>> {
    try {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { number: data.number }
      });

      if (existingInvoice) {
        return { 
          success: false, 
          error: 'Ya existe una factura con este número' 
        };
      }

      const invoice = await prisma.invoice.create({
        data: {
          number: data.number,
          date: new Date(data.date),
          clientId: data.clientId,
          projectId: data.projectId,
          paymentType: data.paymentType,
          paymentTerm: data.paymentTerm,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: 'DRAFT',
          observations: data.observations,
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
          payments: true
        }
      });

      return { success: true, data: invoice };
    } catch (error) {
      console.error('Error creating invoice:', error);
      return { 
        success: false, 
        error: 'No se pudo crear la factura',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getAll(filters?: InvoiceFilters): Promise<ApiResponse<Invoice[]>> {
    try {
      console.log('Getting invoices with filters:', filters);
      
      const where: any = {};

      // Solo agregar status si existe y no es 'all'
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status.toUpperCase();
      }
      
      // Solo agregar projectId si existe y no es 'all'
      if (filters?.projectId && filters.projectId !== 'all') {
        where.projectId = filters.projectId;
      }

      // Solo agregar clientId si existe
      if (filters?.clientId) {
        where.clientId = filters.clientId;
      }

      // Agregar búsqueda por número o cliente si existe
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

      // Agregar filtro de fechas si ambas existen
      if (filters?.startDate && filters?.endDate) {
        where.date = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }

      console.log('Final where clause:', where);

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          client: true,
          project: true,
          items: true,
          payments: true
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
      console.error('Error fetching invoices:', error);
      return { 
        success: false, 
        error: 'No se pudieron obtener las facturas',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

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
      console.error('Error fetching invoice:', error);
      return { 
        success: false, 
        error: 'No se pudo obtener la factura',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async update(id: string, data: Partial<CreateInvoiceDTO>): Promise<ApiResponse<Invoice>> {
    try {
      // Verificar que la factura existe
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id },
        include: { payments: true }
      });

      if (!existingInvoice) {
        return { 
          success: false, 
          error: 'Factura no encontrada' 
        };
      }

      // No permitir actualizar facturas pagadas
      if (existingInvoice.status === 'PAID') {
        return {
          success: false,
          error: 'No se puede actualizar una factura pagada'
        };
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          ...(data.number && { number: data.number }),
          ...(data.date && { date: new Date(data.date) }),
          ...(data.clientId && { clientId: data.clientId }),
          ...(data.projectId && { projectId: data.projectId }),
          ...(data.paymentType && { paymentType: data.paymentType.toUpperCase() }),
          ...(data.paymentTerm && { paymentTerm: data.paymentTerm }),
          ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
          ...(data.observations && { observations: data.observations })
        },
        include: {
          client: true,
          project: true,
          items: true,
          payments: true
        }
      });

      return { success: true, data: invoice };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return { 
        success: false, 
        error: 'No se pudo actualizar la factura',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async registerPayment(id: string, paymentData: PaymentDTO): Promise<ApiResponse<InvoicePayment>> {
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

      const payment = await prisma.$transaction(async (prisma) => {
        const payment = await prisma.invoicePayment.create({
          data: {
            invoiceId: id,
            amount: paymentData.amount,
            paymentDate: new Date(paymentData.paymentDate),
            paymentMethod: paymentData.paymentMethod.toUpperCase(),
            reference: paymentData.reference,
            observations: paymentData.observations
          }
        });

        const totalPaid = invoice.payments.reduce((sum, p) => 
          sum + p.amount, 0) + paymentData.amount;
        const invoiceTotal = invoice.items.reduce((sum, item) => 
          sum + item.total, 0);

        await prisma.invoice.update({
          where: { id },
          data: {
            status: totalPaid >= invoiceTotal ? 'PAID' : 'PARTIAL'
          }
        });

        return payment;
      });

      return { 
        success: true, 
        data: payment,
        message: 'Pago registrado correctamente'
      };
    } catch (error) {
      console.error('Error registering payment:', error);
      return { 
        success: false, 
        error: 'No se pudo registrar el pago',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async uploadDocument(id: string, file: Express.Multer.File): Promise<ApiResponse<Document>> {
    try {
      // Verificar que la factura existe
      const invoice = await prisma.invoice.findUnique({
        where: { id }
      });

      if (!invoice) {
        return { 
          success: false, 
          error: 'Factura no encontrada' 
        };
      }

      const document = await prisma.document.create({
        data: {
          invoiceId: id,
          name: file.originalname,
          path: file.path,
          type: file.mimetype
        }
      });

      return { 
        success: true, 
        data: document,
        message: 'Documento subido correctamente'
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return { 
        success: false, 
        error: 'No se pudo subir el documento',
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

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

      let nextNumber;
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.number.slice(-4));
        nextNumber = `F${currentYear}${(lastNumber + 1).toString().padStart(4, '0')}`;
      } else {
        nextNumber = `F${currentYear}0001`;
      }

      return { 
        success: true, 
        data: nextNumber 
      };
    } catch (error) {
      console.error('Error generating next number:', error);
      return { 
        success: false, 
        error: 'No se pudo generar el siguiente número de factura' 
      };
    }
  }
}

// Exportar una única instancia del servicio
const invoiceService = new InvoiceService();
export default invoiceService;