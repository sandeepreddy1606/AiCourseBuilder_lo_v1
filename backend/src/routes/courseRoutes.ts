import express from 'express';
import { getCourses, getCourseById, createCourse, deleteCourse } from '../controllers/courseController';
import { getLessons, createLessons } from '../controllers/lessonController';
import { planCourse, executeCourse } from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/plan', protect, planCourse);
router.post('/:id/execute', protect, executeCourse);

router.route('/')
    .get(protect, getCourses)
    .post(protect, createCourse);

router.route('/:id')
    .get(protect, getCourseById)
    .delete(protect, deleteCourse);

router.route('/:id/lessons')
    .get(protect, getLessons)
    .post(protect, createLessons);

export default router;
