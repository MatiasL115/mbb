// src/types/invoice.types.ts
export interface Invoice {
  id: string;
  number: string;
  date: Date;
  clientId: string;
  projectId?: string;
  paymentType: 'cash' | 'credit';
  paymentTerm?: number;
  dueDate?: Date;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED' | 'PARTIAL';
  observations?: string;
  items: InvoiceItem[];
  documents?: Document[];
  // Relaciones
  client?: Client;
  project?: Project;
  payments?: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Document {
  id: string;
  invoiceId: string;
  name: string;
  path: string;
  type: string;
  uploadedAt: Date;
}

export interface CreateInvoiceDTO {
  number: string;
  date: string;
  clientId: string;
  projectId?: string;
  paymentType: 'cash' | 'credit';
  paymentTerm?: number;
  dueDate?: string;
  observations?: string;
  items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
  }>;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference?: string;
  observations?: string;
}

// Interfaces adicionales necesarias
export interface InvoiceFilters {
  search?: string;
  status?: string;
  clientId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaymentDTO {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  observations?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interfaces para relaciones
export interface Client {
  id: string;
  name: string;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}