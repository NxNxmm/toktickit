import { Router } from 'express';
import {
    createTicket,
    getTickets,
    getTicketById,
    uploadAttachmentToTicket,
    downloadAttachment,
    removeAttachment,
} from '../controllers/ticket.controller.js';
import { getRelatedSystems } from '../controllers/relatedSystem.controller.js';
import {
    getPublicComments,
    postPublicComment,
    postResolveIndication,
    getInternalNotes,
    postInternalNote,
} from '../controllers/comment.controller.js';
import {
    listActionsTaken,
    createActionTaken,
    updateActionTaken,
} from '../controllers/actionsTaken.controller.js';
import { updateTicketWorkflow } from '../controllers/workflow.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/related-systems', getRelatedSystems);
// AC-4.1: Strictly enforce authenticated session identity on all ticket & attachment APIs
router.get('/tickets', requireAuth, getTickets);
router.post('/tickets', requireAuth, upload.array('files', 5), createTicket);

// Issue 6 routes: Ticket details and attachment lifecycle (requireAuth per AC-4.1)
router.get('/tickets/:id', requireAuth, getTicketById);
router.post('/tickets/:id/attachments', requireAuth, upload.single('file'), uploadAttachmentToTicket);
router.get('/attachments/:id/download', requireAuth, downloadAttachment);
router.post('/attachments/:id/remove', requireAuth, removeAttachment);

// ─── Issue 4 routes: Public Comments, Resolve Indication, Internal Notes ─────

// AC-4.2: Public Comments — owner (REQUESTER), IT_STAFF, or ADMIN
router.get('/tickets/:id/comments', requireAuth, getPublicComments);
router.post('/tickets/:id/comments', requireAuth, postPublicComment);

// AC-4.3: Problem Appears Resolved — REQUESTER owner only (non-REQUESTER → 403)
router.post('/tickets/:id/resolve-indication', requireAuth, postResolveIndication);

// AC-4.4: Internal Notes — IT_STAFF/ADMIN only (REQUESTER → 403 Forbidden)
router.get('/tickets/:id/notes', requireAuth, getInternalNotes);
router.post('/tickets/:id/notes', requireAuth, postInternalNote);

// ─── Lab 4 Issue #2: Actions Taken CRUD ──────────────────────────────────────
// GET  — REQUESTER (own ticket only), IT_STAFF, ADMIN
// POST — IT_STAFF, ADMIN only (actor derived from session)
router.get('/tickets/:id/actions-taken', requireAuth, listActionsTaken);
router.post('/tickets/:id/actions-taken', requireAuth, createActionTaken);
router.patch('/tickets/:id/actions-taken/:actionId', requireAuth, updateActionTaken);

// ─── Lab 4 Issue #2: Ticket Workflow with Optimistic Concurrency ─────────────
// PATCH — IT_STAFF/ADMIN for transitions; REQUESTER for advisory indication only
router.patch('/tickets/:id/workflow', requireAuth, updateTicketWorkflow);

export default router;

