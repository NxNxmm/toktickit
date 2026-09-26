import { Router } from 'express';
import { login, getMe, logout, changePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public login endpoint
router.post('/auth/login', login);

// Authenticated session endpoints
router.get('/auth/me', requireAuth, getMe);
router.post('/auth/logout', requireAuth, logout);

// Password change endpoint (supports POST per spec and PATCH for backward compatibility)
router.post('/auth/change-password', requireAuth, changePassword);
router.patch('/auth/change-password', requireAuth, changePassword);

export default router;
