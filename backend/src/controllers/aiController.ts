import { Request, Response } from 'express';
import pool from '../config/db';
import { COURSE_DEFAULTS } from '../config/defaults';
import { Orchestrator } from '../agents/Orchestrator';

export const planCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { topic, courseId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            res.status(500).json({ message: "GEMINI_API_KEY is not set" });
            return;
        }

        // Initialize Orchestrator (SSE not strictly needed for quick plan, but useful if we want progress)
        // For planning, we might not use SSE if it's fast, but let's keep it consistent or use simple response.
        // The prompt says "Return the JSON to the frontend", implying a standard HTTP response, not SSE.
        // But the previous implementation used SSE. Let's use standard JSON for the plan to allow easy editing.

        const orchestrator = new Orchestrator((event, data) => {
            console.log(`[Planning] ${event}: ${JSON.stringify(data)}`);
        });

        console.log(`[Plan] Generating plan for: ${topic}`);
        const plan = await orchestrator.planCourse(topic);

        // Save Draft Lessons
        const savedLessons = [];
        for (let i = 0; i < plan.lessons.length; i++) {
            const lessonData = plan.lessons[i];
            const { rows } = await pool.query(
                `INSERT INTO lessons 
                (course_id, title, content, order_index, cognitive_level, pedagogical_metadata, is_completed) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id, title, order_index`,
                [
                    courseId,
                    lessonData.title,
                    'Draft Content - Waiting for Execution', // Placeholder
                    i,
                    lessonData.cognitive_level || 'understand',
                    JSON.stringify({ ...lessonData, status: 'draft' }), // Store plan metadata
                    false
                ]
            );
            savedLessons.push(rows[0]);
        }

        res.json({ success: true, plan: plan, lessonIds: savedLessons });

    } catch (error: any) {
        console.error("Planning error:", error);
        res.status(500).json({ message: error.message || 'Planning failed' });
    }
};

export const executeCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { courseId, plan } = req.body;
        const topic = req.body.topic; // Need topic for audio fallback context

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

        const orchestrator = new Orchestrator(sendEvent);
        sendEvent('progress', { percent: 1, message: "🚀 Orchestrator: Starting Execution Loop..." });

        // Execute Request
        const userId = req.user ? req.user.id : 'anonymous';
        const lessonResults = await orchestrator.executeCourse(courseId, plan, userId, topic);

        sendEvent('progress', { percent: 90, message: "💾 Saving results..." });

        // Update Lessons
        // We assume the order matches because we generated them in order. 
        // Or we can match by title/index. 
        // Better: Orchestrator returns results in same order.

        // We first get the existing lesson IDs to map updates.
        const existingLessons = await pool.query(
            `SELECT id, order_index FROM lessons WHERE course_id = $1 ORDER BY order_index ASC`,
            [courseId]
        );

        // Note: If the user edited the plan (added/removed lessons), the DB IDs might not match perfectly 1:1 if we didn't update DB on edit.
        // For phase 8 MVP, we assume the plan passed to execute matches the Draft lessons in DB count/order 
        // or we simply wipe and recreate, OR update by index.
        // Let's assume update by index for simplicity.

        for (let i = 0; i < lessonResults.length; i++) {
            const lessonData = lessonResults[i];
            const lessonId = existingLessons.rows[i]?.id;

            if (lessonId) {
                await pool.query(
                    `UPDATE lessons SET 
                    content = $1, 
                    videos = $2, 
                    quiz_data = $3, 
                    notes = $4,
                    pedagogical_metadata = $5
                    WHERE id = $6`,
                    [
                        lessonData.content,
                        JSON.stringify(lessonData.videos),
                        JSON.stringify(lessonData.quiz_data),
                        lessonData.notes,
                        JSON.stringify(lessonData.pedagogical_metadata || {}),
                        lessonId
                    ]
                );
            } else {
                // New lesson added during plan edit? Insert it.
                await pool.query(
                    `INSERT INTO lessons 
                    (course_id, title, content, order_index, videos, quiz_data, notes, cognitive_level, pedagogical_metadata) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        courseId,
                        lessonData.title,
                        lessonData.content,
                        i,
                        JSON.stringify(lessonData.videos),
                        JSON.stringify(lessonData.quiz_data),
                        lessonData.notes,
                        lessonData.cognitive_level,
                        JSON.stringify(lessonData.pedagogical_metadata)
                    ]
                );
            }
        }

        sendEvent('progress', { percent: 100, message: "✨ Course Generation Complete!" });
        sendEvent('complete', { success: true });
        res.end();

    } catch (error: any) {
        console.error("Execution error:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Execution failed' })}\n\n`);
        res.end();
    }
};
