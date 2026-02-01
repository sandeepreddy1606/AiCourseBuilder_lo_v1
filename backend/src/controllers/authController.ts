import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db';
import { generateToken } from '../utils/jwt';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, full_name } = req.body;

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, passwordHash]
        );

        const userId = newUser.rows[0].id; // Extract UUID

        // Create profile
        if (full_name) {
            await pool.query('INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)', [userId, full_name]);
        } else {
            await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);
        }

        res.status(201).json({
            id: userId,
            email: newUser.rows[0].email,
            token: generateToken(userId),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        res.json({
            id: user.id,
            email: user.email,
            token: generateToken(user.id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMe = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);

        if (userResult.rows.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const user = userResult.rows[0];
        const profile = profileResult.rows[0] || {};

        res.json({
            id: user.id,
            email: user.email,
            profile: profile
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}
