// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import AuthService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleId } = req.body;

    const user = await AuthService.createUser({
      email,
      password,
      name,
      roleId
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al registrar usuario'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login(email, password);
    
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, roleId } = req.body;

    const user = await AuthService.createUser({
      name,
      email,
      password,
      roleId
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear usuario'
    });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { search, roleId, status, page, limit } = req.query;

    const result = await AuthService.getAllUsers({
      search: search as string,
      roleId: roleId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      data: result.users,
      total: result.total,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await AuthService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleId } = req.body;

    const user = await AuthService.updateUser(id, {
      name,
      email,
      roleId
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar usuario'
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    await AuthService.updatePassword(id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar contraseña'
    });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await AuthService.deactivateUser(id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
};

export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await AuthService.activateUser(id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al activar usuario'
    });
  }
};