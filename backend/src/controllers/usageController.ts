import { Request, Response } from 'express';
import pool from '../config/db';

export const getUsageStats = async (req: Request & { user?: any }, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Get Total Usage
        const totalResult = await pool.query(
            'SELECT SUM(tokens) as total_tokens FROM usage_logs WHERE user_id = $1',
            [userId]
        );
        const totalTokens = parseInt(totalResult.rows[0].total_tokens || '0');

        // 2. Get Recent History
        const historyResult = await pool.query(
            `SELECT ul.tokens, ul.model, ul.created_at, c.title as course_title 
             FROM usage_logs ul 
             LEFT JOIN courses c ON ul.course_id = c.id
             WHERE ul.user_id = $1 
             ORDER BY ul.created_at DESC 
             LIMIT 10`,
            [userId]
        );

        res.json({
            totalTokens,
            history: historyResult.rows
        });

    } catch (error) {
        console.error("Error fetching usage stats:", error);
        res.status(500).json({ message: "Server error" });
    }
};
