import { Router } from 'express';
import { createTicket } from '../controllers/ticket.controller.js';
import { getRelatedSystems } from '../controllers/relatedSystem.controller.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/related-systems', getRelatedSystems);
router.post('/tickets', upload.array('files', 5), createTicket);

export default router;
