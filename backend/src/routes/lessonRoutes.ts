import express from 'express';
import { updateLesson, deleteLesson } from '../controllers/lessonController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/:id')
    .put(protect, updateLesson)
    .delete(protect, deleteLesson);

export default router;
