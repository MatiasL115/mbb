// src/controllers/role.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: {
      name: string;
      permissions: string[];
    };
  };
}

export const createRole = async (req: RequestWithUser, res: Response) => {
  try {
    const { name, permissions } = req.body;

    // Verificar si el rol ya existe
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un rol con ese nombre'
      });
    }

    const role = await prisma.role.create({
      data: {
        name,
        permissions
      }
    });

    res.status(201).json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear rol'
    });
  }
};

export const getRoles = async (req: RequestWithUser, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles'
    });
  }
};

export const updateRole = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const role = await prisma.role.update({
      where: { id },
      data: {
        permissions
      }
    });

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar rol'
    });
  }
};

export const assignRoleToUser = async (req: RequestWithUser, res: Response) => {
  try {
    const { userId, roleId } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        roleId
      },
      include: {
        role: true
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar rol'
    });
  }
};