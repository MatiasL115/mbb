// src/controllers/finance.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

interface LoanInstallment {
  number: number;
  date: string;
  amount: number;
  capital: number;
  interest: number;
  balance: number;
}

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
    };
  };
}

export const createLoan = async (req: RequestWithUser, res: Response) => {
  try {
    const { 
      bankId, 
      projectId, 
      totalAmount, 
      term, 
      interestRate,
      startDate,
      paymentFrequency,
      observations,
      installments 
    } = req.body;

    // Validaciones básicas
    if (!bankId || !totalAmount || !term || !interestRate || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    // Generar número de préstamo
    const year = new Date().getFullYear();
    const lastLoan = await prisma.loan.findFirst({
      where: {
        number: {
          startsWith: `LOAN-${year}`
        }
      },
      orderBy: {
        number: 'desc'
      }
    });

    let number;
    if (lastLoan) {
      const lastNumber = parseInt(lastLoan.number.split('-')[2]);
      number = `LOAN-${year}-${(lastNumber + 1).toString().padStart(3, '0')}`;
    } else {
      number = `LOAN-${year}-001`;
    }

    // Crear el préstamo y sus cuotas
    const loan = await prisma.loan.create({
      data: {
        number,
        bankId,
        projectId,
        totalAmount: parseFloat(totalAmount),
        term: parseInt(term),
        interestRate: parseFloat(interestRate),
        startDate: new Date(startDate),
        paymentFrequency,
        observations,
        status: 'ACTIVE',
        creatorId: req.user.id,
        installments: {
          create: installments.map((inst: LoanInstallment) => ({
            number: inst.number,
            date: new Date(inst.date),
            amount: inst.amount,
            capital: inst.capital,
            interest: inst.interest,
            balance: inst.balance,
            status: 'PENDING'
          }))
        }
      },
      include: {
        bank: true,
        project: true,
        installments: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear préstamo'
    });
  }
};

export const getLoans = async (req: RequestWithUser, res: Response) => {
  try {
    const { status, bankId } = req.query;

    const loans = await prisma.loan.findMany({
      where: {
        ...(status && { status: String(status) }),
        ...(bankId && { bankId: String(bankId) })
      },
      include: {
        bank: true,
        project: true,
        installments: {
          orderBy: {
            number: 'asc'
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener préstamos'
    });
  }
};

export const getLoanById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        bank: true,
        project: true,
        installments: {
          orderBy: {
            number: 'asc'
          }
        },
        payments: {
          include: {
            installment: true,
            registeredBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Préstamo no encontrado'
      });
    }

    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener préstamo'
    });
  }
};

export const updateLoan = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status, observations } = req.body;

    const loan = await prisma.loan.update({
      where: { id },
      data: {
        status,
        observations
      },
      include: {
        bank: true,
        project: true,
        installments: true
      }
    });

    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar préstamo'
    });
  }
};

export const registerPayment = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      installmentId, 
      amount, 
      paymentDate, 
      paymentMethod, 
      reference,
      observations 
    } = req.body;

    // Verificar que la cuota existe y pertenece al préstamo
    const installment = await prisma.loanInstallment.findFirst({
      where: {
        id: installmentId,
        loanId: id
      }
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        message: 'Cuota no encontrada'
      });
    }

    // Registrar el pago
    const payment = await prisma.loanPayment.create({
      data: {
        loanId: id,
        installmentId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        paymentMethod,
        reference,
        observations,
        registeredById: req.user.id
      }
    });

    // Actualizar estado de la cuota
    await prisma.loanInstallment.update({
      where: { id: installmentId },
      data: {
        status: 'PAID',
        paidDate: new Date(paymentDate)
      }
    });

    // Verificar si todas las cuotas están pagadas para actualizar el préstamo
    const unpaidInstallments = await prisma.loanInstallment.count({
      where: {
        loanId: id,
        status: 'PENDING'
      }
    });

    if (unpaidInstallments === 0) {
      await prisma.loan.update({
        where: { id },
        data: {
          status: 'COMPLETED'
        }
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Register payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar pago'
    });
  }
};