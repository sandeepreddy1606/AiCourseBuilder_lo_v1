import { Request, Response } from 'express';
import pool from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import YouTube from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to sanitize JSON
const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();


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
            quiz_data: null,
            tokens: 0
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

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: contentPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    let generatedContent;
    try {
        generatedContent = JSON.parse(cleanJson(result.response.text()));
    } catch (e) {
        console.error("Failed to parse AI response used fallback:", e);
        generatedContent = {
            content: "Content generation failed. Please review the video.",
            notes: "Notes unavailable.",
            quiz_data: { questions: [] }
        };
    }

    const tokens = result.response.usageMetadata?.totalTokenCount || 0;

    return {
        title: lessonTitle,
        content: generatedContent.content || "No content generated",
        videos: [videoData],
        notes: generatedContent.notes || "No notes generated",
        quiz_data: generatedContent.quiz_data || { questions: [] },
        tokens
    };
}

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

        // Revert to 1.5-flash for better rate limits (1500 RPD vs 20 RPD for 2.5-flash)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let totalTokens = 0;

        sendEvent('progress', { percent: 10, message: `Analyzing topic: "${topic}"...` });

        // Step 1: Determine Structure
        let structure;
        try {
            const prompt = `
            Analyze the topic: "${topic}".
            Is this a "Small Topic" (can be explained in 1 video) or a "Big Topic" (needs a roadmap of 3-5 sub-modules)?
            
            Return JSON:
            {
                "type": "small" | "big",
                "lessons": [ "Lesson Title 1" ] // If small, just 1 title. If big, 3-5 lesson titles.
            }
            `;
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });
            const text = cleanJson(result.response.text());
            structure = JSON.parse(text);

            if (result.response.usageMetadata) {
                totalTokens += result.response.usageMetadata.totalTokenCount || 0;
            }

            console.log("Structure:", structure);
            sendEvent('progress', { percent: 20, message: `Determined structure: ${structure.type} course with ${structure.lessons.length} lessons.` });
        } catch (err: any) {
            console.error("Structure error:", err);
            structure = { type: 'small', lessons: [`Introduction to ${topic}`] };
            sendEvent('progress', { percent: 20, message: "Standard structure determined." });
        }

        const savedLessons = [];
        const lessonsToProcess = structure.lessons.slice(0, 5);
        const totalLessons = lessonsToProcess.length;

        for (let i = 0; i < lessonsToProcess.length; i++) {
            const lessonTitle = lessonsToProcess[i];
            const currentPercent = 20 + ((i / totalLessons) * 70); // 20% to 90%

            sendEvent('progress', {
                percent: Math.round(currentPercent),
                message: `Generating Lesson ${i + 1}/${totalLessons}: "${lessonTitle}"`
            });

            // Add detailed logs for substeps if possible, but for now just lesson level
            const lessonData = await processLesson(topic, lessonTitle, model);

            // Accumulate tokens
            // @ts-ignore
            if (lessonData.tokens) totalTokens += lessonData.tokens;

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

        sendEvent('progress', { percent: 100, message: "Finalizing course..." });

        // Send Usage Stats
        sendEvent('usage', { totalTokens, model: "gemini-1.5-flash" });

        sendEvent('complete', { success: true, lessons: savedLessons });
        res.end();

    } catch (error: any) {
        console.error("Generation error:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Server error' })}\n\n`);
        res.end();
    }
};
