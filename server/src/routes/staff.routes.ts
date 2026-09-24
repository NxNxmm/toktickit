import { Router } from 'express';
import { getStaffTicketQueue } from '../controllers/staff.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// AC-5.1 / AC-5.3: IT Staff Ticket Queue — IT_STAFF and ADMIN only
router.get('/staff/tickets', requireAuth, getStaffTicketQueue);

export default router;
