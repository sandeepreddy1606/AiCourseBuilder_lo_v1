import { Request, Response } from 'express';
import pool from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import YouTube from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to sanitize JSON
const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

// 1. Determine Course Structure
async function determineStructure(topic: string, model: any) {
    const prompt = `
    Analyze the topic: "${topic}".
    Is this a "Small Topic" (can be explained in 1 video) or a "Big Topic" (needs a roadmap of 3-5 sub-modules)?
    
    Return JSON:
    {
        "type": "small" | "big",
        "lessons": [ "Lesson Title 1" ] // If small, just 1 title. If big, 3-5 lesson titles.
    }
    `;
    const result = await model.generateContent(prompt);
    const text = cleanJson(result.response.text());
    return JSON.parse(text);
}

// 2. Process Single Lesson (Video -> Transcript -> Content)
async function processLesson(topic: string, lessonTitle: string, model: any) {
    console.log(`Processing lesson: ${lessonTitle}`);

    // A. Search YouTube
    const searchQuery = `${lessonTitle} ${topic} tutorial`;
    // @ts-ignore
    const videos: any[] = await YouTube.search(searchQuery, { limit: 1 });

    if (videos.length === 0) {
        return {
            title: lessonTitle,
            content: `Overview of ${lessonTitle}`,
            videos: [],
            notes: "No video found. AI generated summary...",
            quiz_data: null
        };
    }

    const video = videos[0];
    const videoData = {
        id: video.id,
        title: video.title || lessonTitle,
        url: video.url,
        // @ts-ignore
        thumbnail: video.thumbnail?.url || ''
    };

    // B. Get Transcript
    let transcriptText = "";
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(video.id!);
        transcriptText = transcript.map(t => t.text).join(' ').slice(0, 15000); // Limit length
    } catch (e) {
        console.log(`No transcript for ${video.id}, using video description/title`);
        transcriptText = `Title: ${video.title}. No transcript available.`;
    }

    // C. Generate Notes & Quiz
    const contentPrompt = `
    Based on this video transcript about "${lessonTitle}":
    "${transcriptText}"

    1. Write a short content summary (2-3 sentences).
    2. Create detailed Notes (markdown bullet points).
    3. Create a Quiz with 3 questions (JSON).

    Output JSON:
    {
        "content": "...",
        "notes": "...",
        "quiz_data": {
            "questions": [
                {
                    "question": "...",
                    "options": ["a", "b", "c", "d"],
                    "correctAnswer": 0 // index
                }
            ]
        }
    }
    `;

    const result = await model.generateContent(contentPrompt);
    const generatedContent = JSON.parse(cleanJson(result.response.text()));

    return {
        title: lessonTitle,
        content: generatedContent.content,
        videos: [videoData],
        notes: generatedContent.notes,
        quiz_data: generatedContent.quiz_data
    };
}

export const generateCourse = async (req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
        const { topic, courseId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Step 1: Determine Structure
        const structure = await determineStructure(topic, model);
        console.log("Structure:", structure);

        const savedLessons = [];

        // Step 2: Process each lesson
        // Limit to 5 max to prevent timeouts
        const lessonsToProcess = structure.lessons.slice(0, 5);

        for (let i = 0; i < lessonsToProcess.length; i++) {
            const lessonTitle = lessonsToProcess[i];
            const lessonData = await processLesson(topic, lessonTitle, model);

            const { rows } = await pool.query(
                'INSERT INTO lessons (course_id, title, content, order_index, videos, quiz_data, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    courseId,
                    lessonData.title,
                    lessonData.content,
                    i,
                    JSON.stringify(lessonData.videos),
                    JSON.stringify(lessonData.quiz_data),
                    lessonData.notes
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
