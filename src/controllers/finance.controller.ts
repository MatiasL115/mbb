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

export const createLoan = async (req: Request, res: Response) => {
  try {
    // Verificamos si hay usuario
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

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
          create: (installments as LoanInstallment[]).map((inst: LoanInstallment) => ({
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

    return res.status(201).json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Create loan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear préstamo'
    });
  }
};

export const getLoans = async (req: Request, res: Response) => {
  try {
    const { status, bankId } = req.query;

    // Obtenemos los préstamos con Prisma
    const loans = await prisma.loan.findMany({
      where: {
        // Filtra por estado y banco si vienen en la query
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

    console.log(`getLoans => Se encontraron ${loans.length} préstamos`, loans);

    return res.json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get loans error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener préstamos'
    });
  }
};

// ====================
// MODIFICACIÓN AQUÍ
// ====================
export const getLoanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        bank: true,
        project: true,
        installments: {
          orderBy: { number: 'asc' }
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

    // Sumar todos los montos de las payments para obtener paidAmount
    const totalPaid = loan.payments.reduce((acc, p) => acc + Number(p.amount), 0);

    // Retornar el objeto con paidAmount incluido
    const responseData = {
      ...loan,
      paidAmount: totalPaid
    };

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get loan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener préstamo'
    });
  }
};
// ====================
// FIN MODIFICACIÓN
// ====================

export const updateLoan = async (req: Request, res: Response) => {
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

    return res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Update loan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar préstamo'
    });
  }
};

export const registerPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id } = req.params;
    const { installmentId, amount, paymentDate, paymentMethod, reference, observations } = req.body;

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

    await prisma.loanInstallment.update({
      where: { id: installmentId },
      data: {
        status: 'PAID',
        paidDate: new Date(paymentDate)
      }
    });

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

    return res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Register payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar pago'
    });
  }
};
