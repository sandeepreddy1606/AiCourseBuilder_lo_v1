import { Request, Response } from 'express';
import pool from '../config/db';
import { COURSE_DEFAULTS } from '../config/defaults';
import { Orchestrator } from '../agents/Orchestrator';

export const generateCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { topic, courseId } = req.body;

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendEvent = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        if (!process.env.GEMINI_API_KEY) {
            sendEvent('error', { message: "GEMINI_API_KEY is not set" });
            res.end();
            return;
        }

        // Initialize Orchestrator with the SSE callback
        // The Orchestrator handles Planning -> Execution -> Verification -> Content Generation
        const orchestrator = new Orchestrator(sendEvent);

        sendEvent('progress', { percent: 1, message: "🚀 core: Starting Agentic Workflow..." });

        // Execute the full course generation workflow
        const lessonResults = await orchestrator.generateCourse(topic);

        sendEvent('progress', { percent: 90, message: "💾 core: Saving lessons to database..." });

        const savedLessons = [];
        let totalTokens = 0; // In a real agent system, we'd track tokens per agent call. 
        // For MVP, we presume the orchestrator might return this, or we estimate.
        // Since Orchestrator doesn't return tokens explicitly in the interface yet, we'll skip detailed token tracking 
        // or add it to the Orchestrator return type. For now, zero or estimate.

        for (let i = 0; i < lessonResults.length; i++) {
            const lessonData = lessonResults[i];

            const { rows } = await pool.query(
                `INSERT INTO lessons 
                (course_id, title, content, order_index, videos, quiz_data, notes, cognitive_level, pedagogical_metadata) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING *`,
                [
                    courseId,
                    lessonData.title,
                    lessonData.content,
                    i,
                    JSON.stringify(lessonData.videos),
                    JSON.stringify(lessonData.quiz_data),
                    lessonData.notes,
                    lessonData.cognitive_level || 'understand',
                    JSON.stringify(lessonData.pedagogical_metadata || {})
                ]
            );
            savedLessons.push(rows[0]);
        }

        sendEvent('progress', { percent: 100, message: "✨ Course Generation Complete!" });

        // Log Usage (simplified)
        if (req.user && req.user.id) {
            try {
                await pool.query(
                    'INSERT INTO usage_logs (user_id, course_id, tokens, model) VALUES ($1, $2, $3, $4)',
                    [req.user.id, courseId, 10000, COURSE_DEFAULTS.AI_MODEL] // Placeholder tokens
                );
            } catch (dbErr) {
                console.error("Failed to save usage log:", dbErr);
            }
        }

        sendEvent('complete', { success: true, lessons: savedLessons });
        res.end();

    } catch (error: any) {
        console.error("Agentic Generation error:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Server error' })}\n\n`);
        res.end();
    }
};

