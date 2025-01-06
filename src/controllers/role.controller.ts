// src/controllers/role.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, permissions } = req.body;

    // Verificar si el rol ya existe
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un rol con ese nombre',
      });
    }

    // Crear el rol
    const role = await prisma.role.create({
      data: {
        name,
        // Ajusta a tu modelo: si permissions es JSON, string[], etc.
        permissions,
      },
    });

    return res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear rol',
    });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Get roles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener roles',
    });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const role = await prisma.role.update({
      where: { id },
      data: { permissions },
    });

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar rol',
    });
  }
};

export const assignRoleToUser = async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.body;

    // Actualizar el campo roleId en el usuario
    const user = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Assign role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar rol',
    });
  }
};
