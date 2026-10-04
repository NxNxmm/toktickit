import { Router } from 'express';
import { getRequesterDashboard, getStaffDashboard, getAdminDashboard } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/dashboard/requester — REQUESTER only
router.get('/dashboard/requester', requireAuth, getRequesterDashboard);

// GET /api/dashboard/staff — IT_STAFF, ADMIN
router.get('/dashboard/staff', requireAuth, getStaffDashboard);

// GET /api/dashboard/admin — ADMIN only
router.get('/dashboard/admin', requireAuth, getAdminDashboard);

export default router;
