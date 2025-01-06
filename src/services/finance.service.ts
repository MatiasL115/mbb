// src/services/finance.service.ts
import axios from 'axios';
import { 
  Bank, 
  Project, 
  Loan, 
  LoanPayment,
  CreateLoanDTO,
  RegisterPaymentDTO,
  ApiResponse 
} from '../types/finance.types';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

const financeApi = axios.create({
  baseURL: `${API_URL}/finance`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar el token de autenticación si se está en entorno navegador
financeApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Servicio para gestión de Bancos
export const bankService = {
  getAll: async (): Promise<ApiResponse<Bank[]>> => {
    const response = await financeApi.get('/banks');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Bank>> => {
    const response = await financeApi.get(`/banks/${id}`);
    return response.data;
  },

  create: async (bank: Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Bank>> => {
    const response = await financeApi.post('/banks', bank);
    return response.data;
  },

  update: async (id: string, bank: Partial<Bank>): Promise<ApiResponse<Bank>> => {
    const response = await financeApi.put(`/banks/${id}`, bank);
    return response.data;
  }
};

// Servicio para gestión de Proyectos
export const projectService = {
  getAll: async (): Promise<ApiResponse<Project[]>> => {
    const response = await financeApi.get('/projects');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Project>> => {
    const response = await financeApi.get(`/projects/${id}`);
    return response.data;
  },

  create: async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Project>> => {
    const response = await financeApi.post('/projects', project);
    return response.data;
  },

  update: async (id: string, project: Partial<Project>): Promise<ApiResponse<Project>> => {
    const response = await financeApi.put(`/projects/${id}`, project);
    return response.data;
  }
};

// Servicio para gestión de Préstamos
export const loanService = {
  getAll: async (filters?: { 
    status?: string; 
    bankId?: string;
    projectId?: string;
  }): Promise<ApiResponse<Loan[]>> => {
    const response = await financeApi.get('/loans', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Loan>> => {
    const response = await financeApi.get(`/loans/${id}`);
    return response.data;
  },

  create: async (loan: CreateLoanDTO): Promise<ApiResponse<Loan>> => {
    const response = await financeApi.post('/loans', loan);
    return response.data;
  },

  update: async (id: string, loan: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const response = await financeApi.put(`/loans/${id}`, loan);
    return response.data;
  },

  // Métodos para gestión de pagos
  registerPayment: async (loanId: string, payment: RegisterPaymentDTO): Promise<ApiResponse<LoanPayment>> => {
    const response = await financeApi.post(`/loans/${loanId}/payments`, payment);
    return response.data;
  },

  // Métodos de utilidad
  calculateInstallments: (
    amount: number,
    term: number,
    interestRate: number,
    startDate: Date,
    frequency: 'monthly' | 'biweekly'
  ) => {
    const installments = [];
    const monthlyRate = (interestRate / 100) / 12;
    const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                          (Math.pow(1 + monthlyRate, term) - 1);
    
    let balance = amount;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= term; i++) {
      const interest = balance * monthlyRate;
      const capital = monthlyPayment - interest;
      balance -= capital;

      installments.push({
        number: i,
        date: new Date(currentDate),
        amount: monthlyPayment,
        capital,
        interest,
        balance: Math.max(0, balance),
        status: 'PENDING'
      });

      if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 14);
      }
    }

    return installments;
  },

  getPaymentSummary: async (loanId: string): Promise<ApiResponse<{
    totalPaid: number;
    totalPending: number;
    nextPayment?: {
      date: Date;
      amount: number;
    };
    lastPayment?: {
      date: Date;
      amount: number;
    };
  }>> => {
    const response = await financeApi.get(`/loans/${loanId}/payment-summary`);
    return response.data;
  }
};

// Export all services
export const financeService = {
  banks: bankService,
  projects: projectService,
  loans: loanService
};

export default financeService;
