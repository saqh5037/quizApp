import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Get all categories for the current tenant
export const getCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || 1;

    const categories = await sequelize.query(
      `SELECT id, name, description, color, is_default, order_position
       FROM quiz_categories
       WHERE tenant_id = :tenantId
       ORDER BY order_position ASC, name ASC`,
      {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las categorias'
    });
  }
};

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || 1;
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoria es requerido'
      });
    }

    // Get next order position
    const [maxPos] = await sequelize.query(
      `SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos
       FROM quiz_categories WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    ) as any;

    const [result] = await sequelize.query(
      `INSERT INTO quiz_categories (name, description, color, tenant_id, is_default, order_position)
       VALUES (:name, :description, :color, :tenantId, false, :orderPosition)
       RETURNING id, name, description, color, is_default, order_position`,
      {
        replacements: {
          name: name.trim(),
          description: description || null,
          color: color || null,
          tenantId,
          orderPosition: maxPos.next_pos
        },
        type: QueryTypes.INSERT
      }
    ) as any;

    res.status(201).json({
      success: true,
      data: result[0],
      message: 'Categoria creada exitosamente'
    });
  } catch (error: any) {
    if (error.original?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una categoria con ese nombre'
      });
    }
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la categoria'
    });
  }
};

// Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || 1;
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Verify ownership
    const [existing] = await sequelize.query(
      `SELECT id FROM quiz_categories WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId }, type: QueryTypes.SELECT }
    ) as any;

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Categoria no encontrada'
      });
    }

    await sequelize.query(
      `UPDATE quiz_categories
       SET name = COALESCE(:name, name),
           description = COALESCE(:description, description),
           color = COALESCE(:color, color),
           updated_at = NOW()
       WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: {
          id,
          tenantId,
          name: name?.trim() || null,
          description: description !== undefined ? description : null,
          color: color || null
        },
        type: QueryTypes.UPDATE
      }
    );

    const [updated] = await sequelize.query(
      `SELECT id, name, description, color, is_default, order_position
       FROM quiz_categories WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ) as any;

    res.json({
      success: true,
      data: updated,
      message: 'Categoria actualizada exitosamente'
    });
  } catch (error: any) {
    if (error.original?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una categoria con ese nombre'
      });
    }
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la categoria'
    });
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || 1;
    const { id } = req.params;

    // Verify ownership
    const [existing] = await sequelize.query(
      `SELECT id, name, is_default FROM quiz_categories WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId }, type: QueryTypes.SELECT }
    ) as any;

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Categoria no encontrada'
      });
    }

    // Check if used by any quizzes
    const [usage] = await sequelize.query(
      `SELECT COUNT(*) as count FROM quizzes
       WHERE category = :categoryName AND (tenant_id = :tenantId OR tenant_id IS NULL)`,
      { replacements: { categoryName: existing.name, tenantId }, type: QueryTypes.SELECT }
    ) as any;

    if (parseInt(usage.count) > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar: ${usage.count} quiz(zes) usan esta categoria`
      });
    }

    await sequelize.query(
      `DELETE FROM quiz_categories WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId }, type: QueryTypes.DELETE }
    );

    res.json({
      success: true,
      message: 'Categoria eliminada exitosamente'
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la categoria'
    });
  }
};
