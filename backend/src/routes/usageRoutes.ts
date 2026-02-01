import express from 'express';
import { getUsageStats } from '../controllers/usageController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getUsageStats);

export default router;
