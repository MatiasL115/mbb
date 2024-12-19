// src/controllers/project.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
    };
  };
}

// GET /api/projects
export const getAll = async (req: RequestWithUser, res: Response) => {
  try {
    const { status, search } = req.query;

    const where: any = {};
    
    // Filtro por status
    if (status) {
      where.status = String(status).toUpperCase();
    }

    // Filtro por búsqueda
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        budgetItems: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            code: true,
            amount: true,
            status: true,
            transactions: true
          }
        },
        loans: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            number: true,
            totalAmount: true,
            status: true
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            number: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Calcular saldos para cada proyecto
    const projectsWithBalances = projects.map(project => {
      const budgetItemsWithBalances = project.budgetItems.map(item => {
        const balance = item.transactions.reduce((acc, trans) => {
          return trans.type === 'CREDIT' 
            ? acc + Number(trans.amount)
            : acc - Number(trans.amount);
        }, Number(item.amount));

        return {
          ...item,
          balance,
          transactions: undefined // Removemos las transacciones del resultado
        };
      });

      return {
        ...project,
        budgetItems: budgetItemsWithBalances
      };
    });

    res.json({
      success: true,
      data: projectsWithBalances
    });
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proyectos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/projects/:id
export const getById = async (req: RequestWithUser, res: Response) => {
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
                date: true
              }
            }
          }
        },
        loans: true,
        purchaseOrders: {
          include: {
            provider: true,
            items: true
          }
        },
        invoices: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          include: {
            items: true,
            payments: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Calcular saldos para cada partida presupuestaria
    const budgetItemsWithBalances = project.budgetItems.map(item => {
      const balance = item.transactions.reduce((acc, trans) => {
        return trans.type === 'CREDIT' 
          ? acc + Number(trans.amount)
          : acc - Number(trans.amount);
      }, Number(item.amount));

      return {
        ...item,
        balance,
        transactions: undefined
      };
    });

    const projectWithBalances = {
      ...project,
      budgetItems: budgetItemsWithBalances
    };

    res.json({
      success: true,
      data: projectWithBalances
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proyecto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/projects
export const create = async (req: RequestWithUser, res: Response) => {
  try {
    const { name, code, description } = req.body;

    // Validaciones básicas
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son requeridos'
      });
    }

    // Verificar que el código no exista
    const existingProject = await prisma.project.findUnique({
      where: { code }
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proyecto con ese código'
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        status: 'ACTIVE'
      },
      include: {
        budgetItems: true
      }
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Proyecto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear proyecto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PUT /api/projects/:id
export const update = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    // Verificar que el proyecto existe
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar si se puede desactivar
    if (status === 'INACTIVE') {
      const hasActiveOrders = await prisma.purchaseOrder.findFirst({
        where: {
          projectId: id,
          status: {
            in: ['PENDING', 'APPROVED']
          }
        }
      });

      if (hasActiveOrders) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar el proyecto porque tiene órdenes activas'
        });
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status
      },
      include: {
        budgetItems: true
      }
    });

    res.json({
      success: true,
      data: project,
      message: 'Proyecto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar proyecto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// DELETE /api/projects/:id
export const remove = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si tiene elementos relacionados
    const hasRelations = await prisma.project.findUnique({
      where: { id },
      include: {
        budgetItems: true,
        purchaseOrders: true,
        loans: true,
        invoices: true
      }
    });

    if (!hasRelations) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    if (
      hasRelations.budgetItems.length > 0 ||
      hasRelations.purchaseOrders.length > 0 ||
      hasRelations.loans.length > 0 ||
      hasRelations.invoices.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el proyecto porque tiene elementos relacionados'
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proyecto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  remove
};