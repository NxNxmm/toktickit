import { Router } from 'express';
import { getActiveRequesters } from '../controllers/requester.controller.js';

const router = Router();
router.get('/requesters/active', getActiveRequesters);

export default router;
