import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------
export const getAll = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;

    const where: Prisma.ProjectWhereInput = {};

    if (status) {
      where.status = String(status).toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        budgetItems: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            code: true,
            amount: true,
            status: true,
            transactions: true,
          },
        },
        loans: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            number: true,
            totalAmount: true,
            status: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            number: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calcular balance en cada BudgetItem
    const projectsWithBalances = projects.map((project) => {
      const budgetItemsWithBalances = project.budgetItems.map((item) => {
        const balance = item.transactions.reduce((acc, trans) => {
          return trans.type === 'CREDIT'
            ? acc + Number(trans.amount)
            : acc - Number(trans.amount);
        }, Number(item.amount));

        return {
          ...item,
          balance,
          transactions: undefined, // omitimos para no devolver toda la info
        };
      });

      return {
        ...project,
        budgetItems: budgetItemsWithBalances,
      };
    });

    return res.json({
      success: true,
      data: projectsWithBalances,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getAll projects:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener proyectos',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// GET /api/projects/summary
// Ruta NUEVA para el “Resumen de Proyectos”
// ---------------------------------------------------------------------
export const getSummary = async (req: Request, res: Response) => {
  try {
    // 1) Obtener proyectos activos
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    // 2) Para cada proyecto, calcular datos reales
    //    - totalBudget: Suma de los BudgetItems.amount
    //    - totalCertified: (Este ejemplo asume que “certificado” se refleja en las PurchaseOrders con estatus “APPROVED”, o que tienes otra lógica).
    //    - approvedPayments: Suma de PaymentRequest aprobadas financieramente (FINANCIAL_APPROVED) asociadas al proyecto
    //    - orderBalance: Suma de las PurchaseOrders que estén en estatus ACTIVO/PENDING/APPROVED, menos lo pagado
    //    - items: detalle de cada BudgetItem
    const summaryData = await Promise.all(
      projects.map(async (project) => {
        // ----------------------------------------------------------------------------
        // totalBudget = Suma de BudgetItems
        const budgetItems = await prisma.budgetItem.findMany({
          where: {
            projectId: project.id,
            status: 'ACTIVE',
          },
          include: {
            transactions: true, // para calcular si lo deseas
          },
        });

        const totalBudget = budgetItems.reduce(
          (acc, item) => acc + Number(item.amount),
          0
        );

        // ----------------------------------------------------------------------------
        // totalCertified
        // EJEMPLO: si consideramos “certificado” la suma de PurchaseOrders en estatus “APPROVED”.
        // Ajusta según tu lógica real de “certificación” (puede que tengas una tabla “Certificates”).
        const poApproved = await prisma.purchaseOrder.findMany({
          where: {
            projectId: project.id,
            status: 'APPROVED',
          },
        });
        const totalCertified = poApproved.reduce(
          (sum, po) => sum + Number(po.totalAmount),
          0
        );

        // progress: (totalCertified / totalBudget) * 100 (si totalBudget != 0)
        const progress =
          totalBudget === 0
            ? 0
            : (totalCertified / totalBudget) * 100;

        // ----------------------------------------------------------------------------
        // approvedPayments
        // Suma de PaymentRequest con status FINANCIAL_APPROVED que pertenezcan al project
        // -> se pueden vincular con PaymentRequest.budgetItem.projectId == project.id
        const prApproved = await prisma.paymentRequest.findMany({
          where: {
            status: 'FINANCIAL_APPROVED',
            budgetItem: {
              projectId: project.id,
            },
          },
        });
        const approvedPayments = prApproved.reduce(
          (sum, pr) => sum + Number(pr.amount),
          0
        );

        // ----------------------------------------------------------------------------
        // orderBalance
        // Consideramos la suma de PurchaseOrders con status PENDING/APPROVED
        // menos los montos pagados (PaymentRequests con FINANCIAL_APPROVED)
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          where: {
            projectId: project.id,
            status: {
              in: ['PENDING', 'APPROVED'],
            },
          },
          include: {
            paymentRequests: {
              where: { status: 'FINANCIAL_APPROVED' },
            },
          },
        });

        let totalPO = 0;
        let totalPOPaid = 0;
        purchaseOrders.forEach((po) => {
          totalPO += Number(po.totalAmount);
          const paidPO = po.paymentRequests.reduce(
            (sum, req) => sum + Number(req.amount),
            0
          );
          totalPOPaid += paidPO;
        });
        const orderBalance = totalPO - totalPOPaid;

        // ----------------------------------------------------------------------------
        // “items” => detalle de BudgetItems: 
        // { id, name, budget, certified, approvedPayments, orderBalance }
        // Ajusta si quieres datos más específicos.
        const items = await Promise.all(
          budgetItems.map(async (item) => {
            // “certified” (opcional) con PurchaseOrders que usen este budgetItem
            const posOfItem = await prisma.purchaseOrder.findMany({
              where: {
                budgetItemId: item.id,
                status: 'APPROVED',
              },
            });
            const certifiedItem = posOfItem.reduce(
              (sum, po) => sum + Number(po.totalAmount),
              0
            );

            // “approvedPaymentsItem” con PaymentRequest FINANCIAL_APPROVED para este item
            const prItem = await prisma.paymentRequest.findMany({
              where: {
                status: 'FINANCIAL_APPROVED',
                budgetItemId: item.id,
              },
            });
            const approvedPaymentsItem = prItem.reduce(
              (sum, pr) => sum + Number(pr.amount),
              0
            );

            // “orderBalanceItem” = total de OCs PENDING/APPROVED - pagado
            const posItemActive = await prisma.purchaseOrder.findMany({
              where: {
                budgetItemId: item.id,
                status: {
                  in: ['PENDING', 'APPROVED'],
                },
              },
              include: {
                paymentRequests: {
                  where: { status: 'FINANCIAL_APPROVED' },
                },
              },
            });
            let totalItemPO = 0;
            let totalItemPOPaid = 0;
            posItemActive.forEach((po) => {
              totalItemPO += Number(po.totalAmount);
              totalItemPOPaid += po.paymentRequests.reduce(
                (acc, req) => acc + Number(req.amount),
                0
              );
            });
            const orderBalanceItem = totalItemPO - totalItemPOPaid;

            return {
              id: item.id,
              name: item.name,
              budget: Number(item.amount),
              certified: certifiedItem,
              approvedPayments: approvedPaymentsItem,
              orderBalance: orderBalanceItem,
            };
          })
        );

        // ----------------------------------------------------------------------------
        // Finalmente, devolvemos el proyecto con esos datos
        return {
          id: project.id,
          name: project.name,
          code: project.code,
          totalBudget,
          totalCertified,
          progress: Math.round(progress),
          approvedPayments,
          orderBalance,
          items,
        };
      })
    );

    return res.json({
      success: true,
      data: summaryData,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getSummary:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de proyectos',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// GET /api/projects/:id
// ---------------------------------------------------------------------
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        budgetItems: {
          include: {
            transactions: true,
            purchaseOrders: {
              select: {
                id: true,
                number: true,
                totalAmount: true,
                status: true,
                date: true,
              },
            },
          },
        },
        loans: true,
        purchaseOrders: {
          include: {
            provider: true,
            items: true,
          },
        },
        invoices: {
          where: {
            status: { not: 'CANCELLED' },
          },
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Calcular balance en cada BudgetItem
    const budgetItemsWithBalances = project.budgetItems.map((item) => {
      const balance = item.transactions.reduce((acc, trans) => {
        return trans.type === 'CREDIT'
          ? acc + Number(trans.amount)
          : acc - Number(trans.amount);
      }, Number(item.amount));

      return {
        ...item,
        balance,
        transactions: undefined,
      };
    });

    const projectWithBalances = {
      ...project,
      budgetItems: budgetItemsWithBalances,
    };

    return res.json({
      success: true,
      data: projectWithBalances,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en getById project:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener proyecto',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------
export const create = async (req: Request, res: Response) => {
  try {
    const { name, code, description } = req.body;

    // Validaciones básicas
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son requeridos',
      });
    }

    // Verificar duplicados
    const existingProject = await prisma.project.findUnique({
      where: { code },
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proyecto con ese código',
      });
    }

    // 1) Crear el proyecto
    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        status: 'ACTIVE',
      },
    });

    // 2) Crear la partida "Pendiente de Asignación"
    const pendingBudget = await prisma.budgetItem.create({
      data: {
        projectId: project.id,
        name: 'Pendiente de Asignación',
        code: `PEND-${project.code}`,
        description: 'Partida temporal para gastos directos sin clasificar',
        amount: 0,
        status: 'ACTIVE',
      },
    });

    // 3) Devolver ambos (o solo project, según prefieras)
    return res.status(201).json({
      success: true,
      data: {
        project,
        pendingBudget,
      },
      message: 'Proyecto creado exitosamente con partida Pendiente de Asignación',
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en create project:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al crear proyecto',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// PUT /api/projects/:id
// ---------------------------------------------------------------------
export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const existingProject = await prisma.project.findUnique({ where: { id } });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Ejemplo de validación: no desactivar si tiene Órdenes activas
    if (status === 'INACTIVE') {
      const hasActiveOrders = await prisma.purchaseOrder.findFirst({
        where: {
          projectId: id,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      if (hasActiveOrders) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar el proyecto porque tiene órdenes activas',
        });
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
      },
      include: {
        budgetItems: true,
      },
    });

    return res.json({
      success: true,
      data: project,
      message: 'Proyecto actualizado exitosamente',
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en update project:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar proyecto',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------
export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const hasRelations = await prisma.project.findUnique({
      where: { id },
      include: {
        budgetItems: true,
        purchaseOrders: true,
        loans: true,
        invoices: true,
      },
    });

    if (!hasRelations) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar que no tenga relaciones
    if (
      hasRelations.budgetItems.length > 0 ||
      hasRelations.purchaseOrders.length > 0 ||
      hasRelations.loans.length > 0 ||
      hasRelations.invoices.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el proyecto porque tiene elementos relacionados',
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Proyecto eliminado exitosamente',
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error en remove project:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar proyecto',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ---------------------------------------------------------------------
// Exportar todo para usarse en rutas
// ---------------------------------------------------------------------
export default {
  getAll,
  getById,
  create,
  update,
  remove,
  // NUEVO:
  getSummary,
};
