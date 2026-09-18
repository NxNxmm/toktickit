import { Router } from 'express';
import { login, changePassword } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post('/auth/login', login);

// PATCH /api/auth/change-password
router.patch('/auth/change-password', changePassword);

export default router;
