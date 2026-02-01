import { Request, Response } from 'express';
import pool from '../config/db';

export const getLessons = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // courseId is passed as :id in courseRoutes for /courses/:id/lessons
        const { rows } = await pool.query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC', [id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createLessons = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // courseId
        const lessonsData = req.body;

        if (Array.isArray(lessonsData)) {
            const results = [];
            for (const lesson of lessonsData) {
                const { title, content, order_index, videos, quiz_data, notes } = lesson;
                const { rows } = await pool.query(
                    'INSERT INTO lessons (course_id, title, content, order_index, videos, quiz_data, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                    [id, title, content || '', order_index, JSON.stringify(videos || []), JSON.stringify(quiz_data || null), notes || '']
                );
                results.push(rows[0]);
            }
            res.status(201).json(results);
        } else {
            const { title, content, order_index, videos, quiz_data, notes } = lessonsData;
            const { rows } = await pool.query(
                'INSERT INTO lessons (course_id, title, content, order_index, videos, quiz_data, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [id, title, content || '', order_index, JSON.stringify(videos || []), JSON.stringify(quiz_data || null), notes || '']
            );
            res.status(201).json(rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateLesson = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates);
        if (fields.length === 0) {
            res.status(400).json({ message: 'No fields to update' });
            return;
        }

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = Object.values(updates);

        // Handle JSON fields if necessary (pg driver handles objects usually, but explicit stringify might be safer if not auto-handled)
        // For simplicity assuming pg parses params correctly or frontend sends correct format.

        const { rows } = await pool.query(
            `UPDATE lessons SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Lesson not found' });
            return;
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

export const deleteLesson = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
        res.json({ message: 'Lesson removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
