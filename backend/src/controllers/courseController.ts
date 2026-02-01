import { Request, Response } from 'express';
import pool from '../config/db';

export const getCourses = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { rows } = await pool.query('SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCourseById = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1 AND user_id = $2', [id, userId]);

        if (rows.length === 0) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { title, description, topic } = req.body;

        const { rows } = await pool.query(
            'INSERT INTO courses (user_id, title, description, topic) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, title, description || '', topic || '']
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if course belongs to user
        const check = await pool.query('SELECT * FROM courses WHERE id = $1 AND user_id = $2', [id, userId]);
        if (check.rows.length === 0) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        await pool.query('DELETE FROM courses WHERE id = $1', [id]);
        res.json({ message: 'Course removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
