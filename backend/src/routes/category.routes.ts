import { Router } from 'express';
import { simpleAuth } from '../middleware/auth.simple.middleware';
import { tenantMiddleware, tenantAdminOnly } from '../middleware/tenant.middleware';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller';

const router = Router();

// All routes require auth + tenant context
router.use(simpleAuth);
router.use(tenantMiddleware);

// GET /api/v1/categories - List categories for current tenant
router.get('/', getCategories);

// POST /api/v1/categories - Create new category (admin only)
router.post('/', tenantAdminOnly, createCategory);

// PUT /api/v1/categories/:id - Update category (admin only)
router.put('/:id', tenantAdminOnly, updateCategory);

// DELETE /api/v1/categories/:id - Delete category (admin only)
router.delete('/:id', tenantAdminOnly, deleteCategory);

export default router;
