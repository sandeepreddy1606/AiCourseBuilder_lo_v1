import { Request, Response } from 'express';
import pool from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { topic, courseId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        Create a detailed online course about "${topic}".
        Generate 5 distinct lessons.
        Output MUST be a valid JSON array of objects. 
        Each object must have these exact keys:
        - title: string
        - content: string (a short summary, 2-3 sentences)
        - notes: string (detailed notes, bullet points using markdown)
        - videos: array of objects (empty array [])
        - quiz_data: object (null)

        Example format:
        [
            {
                "title": "Lesson 1: Basics",
                "content": "Introduction to the topic...",
                "notes": "## Key Points\\n* Point 1",
                "videos": [],
                "quiz_data": null
            }
        ]
        
        Do not wrap in markdown code blocks. Just the raw JSON string.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present (Gemini sometimes adds them)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let generatedLessons;
        try {
            generatedLessons = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse AI response:", text);
            throw new Error("AI generated invalid JSON");
        }

        // Add order_index and save to DB
        const savedLessons = [];
        for (let i = 0; i < generatedLessons.length; i++) {
            const lesson = generatedLessons[i];
            const { rows } = await pool.query(
                'INSERT INTO lessons (course_id, title, content, order_index, videos, quiz_data, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    courseId,
                    lesson.title,
                    lesson.content,
                    i,
                    JSON.stringify(lesson.videos || []),
                    JSON.stringify(lesson.quiz_data || null),
                    lesson.notes || ''
                ]
            );
            savedLessons.push(rows[0]);
        }

        res.json({ success: true, lessons: savedLessons });
    } catch (error: any) {
        console.error("Generation error:", error);
        res.status(500).json({ message: error.message || 'Server error during generation' });
    }
};
