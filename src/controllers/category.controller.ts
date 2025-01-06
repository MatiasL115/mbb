// src/controllers/category.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías'
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Validación básica
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }

    // Verificar si ya existe una categoría con ese nombre
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    // Crear la categoría con su subcategoría por defecto
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        subcategories: {
          create: [{
            name: 'General',
            isDefault: true
          }]
        }
      },
      include: {
        subcategories: true
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear categoría'
    });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría'
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validación básica
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }

    // Verificar si existe la categoría
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si el nuevo nombre ya existe en otra categoría
    const duplicateName = await prisma.category.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (duplicateName) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra categoría con ese nombre'
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        subcategories: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría'
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Eliminar la categoría y sus subcategorías en cascada
    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Categoría eliminada correctamente'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría'
    });
  }
};

// Operaciones de Subcategorías
export const createSubcategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    // Validación básica
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la subcategoría es requerido'
      });
    }

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si ya existe una subcategoría con ese nombre en la categoría
    const existingSubcategory = category.subcategories.find(
      sub => sub.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingSubcategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una subcategoría con ese nombre en esta categoría'
      });
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        name: name.trim(),
        categoryId
      }
    });

    res.status(201).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear subcategoría'
    });
  }
};

// Exportamos todos los controladores
export default {
  getAllCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  createSubcategory
};