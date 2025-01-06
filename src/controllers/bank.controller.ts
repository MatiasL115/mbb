// src/controllers/bank.controller.ts

import { Request, Response } from 'express'
import prisma from '../config/prisma'

// =================================================================
// Obtener todos los bancos
// =================================================================
export const getBanks = async (req: Request, res: Response) => {
  try {
    const banks = await prisma.bank.findMany({
      include: { accounts: true },
      orderBy: { name: 'asc' },
    })
    return res.json({ success: true, data: banks })
  } catch (error) {
    console.error('Error fetching banks:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener bancos' })
  }
}

// =================================================================
// Crear un banco
// =================================================================
export const createBank = async (req: Request, res: Response) => {
  const { name, code, status } = req.body
  try {
    const newBank = await prisma.bank.create({
      data: { name, code, status },
    })
    return res.status(201).json({ success: true, data: newBank })
  } catch (error) {
    console.error('Error creating bank:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al crear el banco' })
  }
}

// =================================================================
// Actualizar banco
// =================================================================
export const updateBank = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, code, status } = req.body
  try {
    const updatedBank = await prisma.bank.update({
      where: { id },
      data: { name, code, status },
    })
    return res.json({ success: true, data: updatedBank })
  } catch (error) {
    console.error('Error updating bank:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al actualizar el banco' })
  }
}

// =================================================================
// Obtener cuentas por banco
// =================================================================
export const getAccountsByBank = async (req: Request, res: Response) => {
  const { bankId } = req.params
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { bankId },
      orderBy: { accountNumber: 'asc' },
    })
    return res.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener cuentas' })
  }
}

// =================================================================
// Crear una cuenta bancaria
// =================================================================
export const createBankAccount = async (req: Request, res: Response) => {
  try {
    const { bankId, accountNumber, type, currency, balance, status } = req.body

    // Validar que el banco exista
    const bankExists = await prisma.bank.findUnique({
      where: { id: bankId },
    })
    if (!bankExists) {
      return res.status(404).json({
        success: false,
        message: 'No existe el banco especificado',
      })
    }

    const newAccount = await prisma.bankAccount.create({
      data: {
        bankId,
        accountNumber,
        type,
        currency,
        balance,
        status,
      },
    })
    return res.status(201).json({ success: true, data: newAccount })
  } catch (error) {
    console.error('Error creating account:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al crear la cuenta' })
  }
}

// =================================================================
// Obtener cuenta por ID
// =================================================================
export const getAccountById = async (req: Request, res: Response) => {
  const { accountId } = req.params
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: { bank: true }, // si querés los datos del banco
    })

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: 'Cuenta no encontrada' })
    }

    return res.json({ success: true, data: account })
  } catch (error) {
    console.error('Error al obtener cuenta:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener la cuenta' })
  }
}

// =================================================================
// Obtener movimientos de una cuenta
// =================================================================
export const getMovementsByAccount = async (req: Request, res: Response) => {
  const { accountId } = req.params
  try {
    const movements = await prisma.bankMovement.findMany({
      where: { bankAccountId: accountId },
      orderBy: { date: 'desc' },
    })
    return res.json({ success: true, data: movements })
  } catch (error) {
    console.error('Error al obtener movimientos:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener movimientos' })
  }
}

// =================================================================
// Obtener chequeras de una cuenta
// =================================================================
export const getCheckbooksByAccount = async (req: Request, res: Response) => {
  const { accountId } = req.params
  try {
    const checkbooks = await prisma.checkbook.findMany({
      where: { bankAccountId: accountId },
      include: {
        checks: true, // quita esto si no quieres los cheques asociados
      },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ success: true, data: checkbooks })
  } catch (error) {
    console.error('Error al obtener chequeras:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener chequeras' })
  }
}

// =================================================================
// Crear un movimiento para una cuenta (OBLIGA a pasar createdBy => userId)
// =================================================================
export const createMovementForAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params
    const { date, description, amount, type, reference, userId } = req.body

    // 1) Verificar si la cuenta existe
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    })
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: 'Cuenta no encontrada' })
    }

    // 2) Verificar userId => no opcional
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Falta el userId para createdBy (requerido).',
      })
    }

    // 3) Crear el movimiento
    const newMovement = await prisma.bankMovement.create({
      data: {
        bankAccount: { connect: { id: accountId } },
        createdBy:   { connect: { id: userId } },
        date: date ? new Date(date) : new Date(),
        description,
        amount,
        type, // "DEBIT" o "CREDIT"
        reference,
      },
    })

    return res.status(201).json({ success: true, data: newMovement })
  } catch (error) {
    console.error('Error al crear movimiento:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al crear movimiento' })
  }
}

// =================================================================
// Crear una chequera para una cuenta
// =================================================================
export const createCheckbookForAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params
    const { initialNumber, finalNumber, checkType, format } = req.body

    // 1) Verificar si la cuenta existe
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    })
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: 'Cuenta no encontrada' })
    }

    // 2) Crear la chequera
    const newCheckbook = await prisma.checkbook.create({
      data: {
        bankAccountId: accountId,
        initialNumber,
        finalNumber,
        checkType, // "REGULAR" | "DEFERRED"
        format,    // "REGULAR" | "COMPACT" | "CONTINUOUS"
        receptionDate: new Date(),
      },
    })

    return res.status(201).json({ success: true, data: newCheckbook })
  } catch (error) {
    console.error('Error al crear chequera:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al crear chequera' })
  }
}

// =================================================================
// Conciliar Movimiento (No opcional: userId y periodId en el request body)
// =================================================================
export const reconcileMovement = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params
    const { movementId, paymentId, userId, periodId } = req.body

    // 1) Validar que movementId, userId, periodId no sean opcionales
    if (!movementId) {
      return res.status(400).json({
        success: false,
        message: 'Falta movementId (requerido).',
      })
    }
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Falta userId (requerido para createdBy).',
      })
    }
    if (!periodId) {
      return res.status(400).json({
        success: false,
        message: 'Falta periodId (requerido).',
      })
    }

    // 2) Verificar si el movimiento existe y pertenece a la cuenta
    const movement = await prisma.bankMovement.findUnique({
      where: { id: movementId },
    })
    if (!movement || movement.bankAccountId !== accountId) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado o no pertenece a esta cuenta.',
      })
    }

    // 3) Verificar que el period exista (ya que no es opcional)
    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: periodId },
    })
    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el período de conciliación indicado.',
      })
    }

    // 4) Crear la conciliación
    // Dado que createdBy es no-opcional, conectamos userId:
    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccount: { connect: { id: accountId } },
        movement:    { connect: { id: movementId } },
        payment:     paymentId ? { connect: { id: paymentId } } : undefined,
        period:      { connect: { id: periodId } },
        createdBy:   { connect: { id: userId } },

        reconciliationDate: new Date(),
        reconciliationType: 'MANUAL',
      },
    })

    // 5) Actualizar el estado del movimiento => RECONCILED
    await prisma.bankMovement.update({
      where: { id: movementId },
      data: { status: 'RECONCILED' },
    })

    return res.status(201).json({ success: true, data: reconciliation })
  } catch (error) {
    console.error('Error al conciliar movimiento:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Error al conciliar movimiento' })
  }
}
