// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import AuthService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleId } = req.body;

    const user = await AuthService.createUser({ email, password, name, roleId });
    if (!user.success) {
      return res.status(400).json(user);
    }

    return res.status(201).json({
      success: true,
      data: user.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Register error:', err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login(email, password);

    if (!result.success) {
      // result podría contener "message" con la razón
      return res.status(401).json({
        success: false,
        message: result.message || 'Authentication failed'
      });
    }

    // Suponiendo que result contiene {success, token, data: AuthUser}
    return res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, roleId } = req.body;

    const result = await AuthService.createUser({ name, email, password, roleId });
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Create user error:', err);
    return res.status(400).json({
      success: false,
      message: err.message
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

    if (!result.success || !result.data) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      data: result.data.users,
      total: result.data.total,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get users error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AuthService.getUserById(id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get user error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleId } = req.body;

    const result = await AuthService.updateUser(id, { name, email, roleId });
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Update user error:', err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const result = await AuthService.updatePassword(id, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Update password error:', err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AuthService.deactivateUser(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Deactivate user error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AuthService.activateUser(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    const err = error as Error;
    console.error('Activate user error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
