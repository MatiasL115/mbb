// src/types/finance.types.ts
export interface Bank {
    id: string;
    name: string;
    code: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Project {
    id: string;
    name: string;
    code: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Loan {
    id: string;
    number: string;
    bankId: string;
    bank?: Bank;
    projectId?: string;
    project?: Project;
    totalAmount: number;
    term: number;
    interestRate: number;
    startDate: Date;
    paymentFrequency: 'monthly' | 'biweekly';
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    observations?: string;
    creatorId: string;
    installments?: LoanInstallment[];
    payments?: LoanPayment[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface LoanInstallment {
    id: string;
    loanId: string;
    number: number;
    date: Date;
    amount: number;
    capital: number;
    interest: number;
    balance: number;
    status: 'PENDING' | 'PAID';
    paidDate?: Date;
    payment?: LoanPayment;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface LoanPayment {
    id: string;
    loanId: string;
    installmentId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: 'transfer' | 'check';
    reference?: string;
    observations?: string;
    registeredById: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Interfaces para las peticiones
  export interface CreateLoanDTO {
    bankId: string;
    projectId?: string;
    totalAmount: number;
    term: number;
    interestRate: number;
    startDate: string;
    paymentFrequency: 'monthly' | 'biweekly';
    observations?: string;
    installments: Omit<LoanInstallment, 'id' | 'loanId' | 'createdAt' | 'updatedAt' | 'payment'>[];
  }
  
  export interface RegisterPaymentDTO {
    installmentId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'transfer' | 'check';
    reference?: string;
    observations?: string;
  }
  
  // Interfaces para las respuestas
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }