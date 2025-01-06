// src/controllers/client.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getClients = async (req: Request, res: Response) => {
  try {
    // Extraemos los filtros de la query
    const { search, status } = req.query;
    
    // Construimos el where dinámicamente
    const where: any = {};
    
    // Si hay búsqueda, buscamos en nombre o RUC
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { ruc: { contains: String(search) } }
      ];
    }

    // Si hay filtro de estado y no es 'all'
    if (status && status !== 'all') {
      where.status = String(status).toUpperCase();
    }

    // Obtenemos los clientes con los filtros aplicados
    const clients = await prisma.client.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    // Respuesta de éxito con 'data' y 'error: null'
    res.json({
      success: true,
      data: clients,
      error: null
    });

  } catch (error) {
    console.error('Error getting clients:', error);

    // Respuesta de error con 'data: null' y 'error: mensaje'
    res.status(500).json({
      success: false,
      data: null,
      error: 'Error al obtener los clientes'
    });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, ruc, email, phone, address } = req.body;

    // Validación básica
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'El nombre es requerido'
      });
    }

    // Verificar si ya existe un cliente con ese RUC
    if (ruc) {
      const existing = await prisma.client.findFirst({
        where: { ruc }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Ya existe un cliente con ese RUC'
        });
      }
    }

    // Crear el cliente
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        ruc: ruc?.trim(),
        email: email?.trim()?.toLowerCase(),
        phone: phone?.trim(),
        address: address?.trim(),
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      data: client,
      error: null
    });

  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Error al crear el cliente'
    });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, ruc, email, phone, address, status } = req.body;

    // Validar que el cliente existe
    const existing = await prisma.client.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Cliente no encontrado'
      });
    }

    // Validación básica
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'El nombre es requerido'
      });
    }

    // Verificar RUC único si se está cambiando
    if (ruc && ruc !== existing.ruc) {
      const duplicateRuc = await prisma.client.findFirst({
        where: { ruc }
      });

      if (duplicateRuc) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Ya existe un cliente con ese RUC'
        });
      }
    }

    // Actualizar el cliente
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name.trim(),
        ruc: ruc?.trim(),
        email: email?.trim()?.toLowerCase(),
        phone: phone?.trim(),
        address: address?.trim(),
        status: status || 'ACTIVE'
      }
    });

    res.json({
      success: true,
      data: client,
      error: null
    });

  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Error al actualizar el cliente'
    });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el cliente existe
    const existing = await prisma.client.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Cliente no encontrado'
      });
    }

    // Aquí podrías agregar lógica para verificar si el cliente tiene relaciones
    // y decidir si hacer un soft delete o eliminar completamente

    await prisma.client.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: null,
      error: null
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Error al eliminar el cliente'
    });
  }
};

export default {
  getClients,
  createClient,
  updateClient,
  deleteClient
};
