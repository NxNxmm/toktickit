import { Router } from 'express';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
} from '../controllers/adminUser.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/admin/users', requireAuth, getAdminUsers);
router.post('/admin/users', requireAuth, createAdminUser);
router.patch('/admin/users/:id', requireAuth, updateAdminUser);
router.post('/admin/users/:id/reset-password', requireAuth, resetAdminUserPassword);

export default router;
