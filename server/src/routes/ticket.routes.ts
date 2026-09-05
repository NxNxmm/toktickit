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
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/related-systems', getRelatedSystems);
router.get('/tickets', getTickets);
router.post('/tickets', upload.array('files', 5), createTicket);

// Issue 6 routes
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/attachments', upload.single('file'), uploadAttachmentToTicket);
router.get('/attachments/:id/download', downloadAttachment);
router.post('/attachments/:id/remove', removeAttachment);

export default router;
