import { Router } from 'express';
import {
    getStaffTicketQueue,
    getStaffAssignees,
    getStaffTicketDetail,
    updateTicketOwnership,
    updateTicketItPriority,
    updateTicketStatus,
} from '../controllers/staff.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// AC-5.1 / AC-5.3: IT Staff Ticket Queue — IT_STAFF and ADMIN only
router.get('/staff/tickets', requireAuth, getStaffTicketQueue);

// AC-6.x UI support: active IT_STAFF / ADMIN users eligible for ownership (BR-08)
router.get('/staff/assignees', requireAuth, getStaffAssignees);

// AC-6.x / api-spec.md §4: Staff ticket detail and operational controls
router.get('/staff/tickets/:id', requireAuth, getStaffTicketDetail);
router.patch('/staff/tickets/:id/ownership', requireAuth, updateTicketOwnership);
router.patch('/staff/tickets/:id/priority', requireAuth, updateTicketItPriority);
router.patch('/staff/tickets/:id/status', requireAuth, updateTicketStatus);

export default router;
