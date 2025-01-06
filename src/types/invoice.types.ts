// src/types/invoice.types.ts

/**
 * Representa la respuesta estándar de la API,
 * con `success` y opcionalmente `data`, `error`, `message`.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Filtros para listar facturas.
 */
export interface InvoiceFilters {
  search?: string;
  status?: string;
  clientId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * DTO de creación de Factura. Observa que:
 * - `date` y `dueDate` se reciben como string (para luego parsear).
 * - `paymentType` se define en minúsculas, pero el servicio convertirá a 'CASH'|'CREDIT'.
 */
export interface CreateInvoiceDTO {
  number: string;
  date: string;
  clientId: string;
  projectId?: string;        // <= opcional => puede llegar como undefined
  paymentType: 'cash' | 'credit';  // el servicio lo normaliza a 'CASH'|'CREDIT'
  paymentTerm?: number;
  dueDate?: string;
  observations?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Entidad Factura tal como la representa la BD (Prisma).
 * Ajusta a:
 * - Campos string|null si la BD permite nulos (`String?`).
 * - Enums en mayúsculas si la BD los maneja así (p.e. 'CASH' | 'CREDIT').
 */
export interface Invoice {
  id: string;
  number: string;
  date: Date;
  clientId: string;

  // projectId es "String?" en Prisma => "string | null"
  projectId: string | null;

  // PaymentType en la BD es enum 'CASH'|'CREDIT'
  paymentType: 'CASH' | 'CREDIT';

  // si en BD es "Int?" => number | null
  paymentTerm: number | null;

  // si en BD es "DateTime?" => Date | null
  dueDate: Date | null;

  // si en BD es enum => 'DRAFT'|'ISSUED'|'PAID'|'CANCELLED'|'PARTIAL'
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'PARTIAL';

  // si en BD es "String?" => string | null
  observations: string | null;

  // Relación con items
  items: InvoiceItem[];

  // Relación con Documentos
  documents: Document[];

  // Relación con Client
  client?: Client | null;

  // Relación con Project
  project?: Project | null;

  // Relación con Payments
  payments?: InvoicePayment[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Item de Factura.
 */
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Representa un archivo/documento asociado a la Factura.
 */
export interface Document {
  id: string;
  invoiceId: string;
  name: string;
  path: string;
  type: string;
  uploadedAt: Date;
}

/**
 * Pagos de la factura (InvoicePayment).
 * Observa que en la BD el PaymentMethod puede ser un enum
 * en mayúsculas. Ajusta a tu preferencia (p.e. 'CASH'|'CHECK'|'TRANSFER', etc.).
 */
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;

  // si en BD es enum => 'CASH'|'CHECK'|'TRANSFER', etc.
  // Ajusta según tu real enum en Prisma
  paymentMethod: string;

  // Campos que podrían ser null en la BD
  reference: string | null;
  observations: string | null;
}

/**
 * Datos para registrar un pago (DTO).
 * Notar que se reciben string en paymentDate y paymentMethod,
 * luego el servicio se encarga de parsear.
 */
export interface PaymentDTO {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  observations?: string;
}

/**
 * Entidad Client (solo campos básicos).
 */
export interface Client {
  id: string;
  name: string;
  // En Prisma sería "status String @default("ACTIVE")" => string
  status: string;
}

/**
 * Entidad Project (solo campos básicos).
 */
export interface Project {
  id: string;
  name: string;
  code: string;
  // Igual, si en BD es "ACTIVE"/"INACTIVE" etc => string
  status: string;
}
