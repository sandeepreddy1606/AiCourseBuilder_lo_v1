import { Request, Response } from 'express';
import pool from '../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from "@google/generative-ai/server";
import YouTube from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';
import { COURSE_DEFAULTS } from '../config/defaults';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');

// Helper to sanitize JSON
const cleanJson = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

// Helper: Download Audio from YouTube
const downloadAudio = async (url: string, videoId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), `${videoId}.mp3`);
        const stream = ytdl(url, { quality: 'lowestaudio', filter: 'audioonly' });

        stream.pipe(fs.createWriteStream(tempFilePath))
            .on('finish', () => resolve(tempFilePath))
            .on('error', (err) => reject(err));
    });
};


// 2. Process Single Lesson (Video -> Transcript/Audio -> Content)
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

    let generatedContent;
    let tokens = 0;

    // B. Get Transcript (Primary Strategy)
    let transcriptText = "";
    let useAudioFallback = false;

    try {
        const transcript = await YoutubeTranscript.fetchTranscript(video.id!);
        transcriptText = transcript.map(t => t.text).join(' ').slice(0, COURSE_DEFAULTS.TRANSCRIPT_CHAR_LIMIT);
        console.log(`✅ Transcript found for ${lessonTitle}`);
    } catch (e) {
        console.log(`⚠️ No transcript for ${video.id}, switching to Audio Fallback...`);
        useAudioFallback = true;
    }

    // C. Generate Content
    if (!useAudioFallback) {
        // STRATEGY 1: TEXT BASED
        const contentPrompt = `
        Based on this video transcript about "${lessonTitle}":
        "${transcriptText}"

        1. Write a short content summary (2-3 sentences).
        2. Create detailed Notes (markdown bullet points).
        3. Create a Quiz with ${COURSE_DEFAULTS.QUIZ_QUESTION_COUNT} questions (JSON).

        Output JSON:
        {
            "content": "...",
            "notes": "...",
            "quiz_data": { 
                "questions": [ { "question": "...", "options": ["a","b","c","d"], "correctAnswer": 0 } ] 
            }
        }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: contentPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        try {
            generatedContent = JSON.parse(cleanJson(result.response.text()));
        } catch (e) {
            generatedContent = { content: "Failed to parse", notes: "", quiz_data: { questions: [] } };
        }
        tokens = result.response.usageMetadata?.totalTokenCount || 0;

    } else {
        // STRATEGY 2: AUDIO BASED
        let audioPath = "";
        try {
            console.log(`⬇️ Downloading audio for ${lessonTitle}...`);
            audioPath = await downloadAudio(video.url, video.id!);

            console.log(`☁️ Uploading audio to Gemini...`);
            const uploadResponse = await fileManager.uploadFile(audioPath, {
                mimeType: "audio/mp3",
                displayName: `Audio: ${lessonTitle}`,
            });

            console.log(`🧠 Analyzing audio for ${lessonTitle}...`);
            const audioPrompt = `
            Listen to this lecture about "${lessonTitle}".
            
            1. Write a short content summary (2-3 sentences).
            2. Create detailed Notes (markdown bullet points).
            3. Create a Quiz with ${COURSE_DEFAULTS.QUIZ_QUESTION_COUNT} questions (JSON).

            Output JSON only.
            `;

            const result = await model.generateContent([
                {
                    fileData: {
                        mimeType: uploadResponse.file.mimeType,
                        fileUri: uploadResponse.file.uri
                    }
                },
                { text: audioPrompt }
            ]);

            try {
                generatedContent = JSON.parse(cleanJson(result.response.text()));
            } catch (e) {
                generatedContent = { content: "Failed to parse audio response", notes: "", quiz_data: { questions: [] } };
            }
            tokens = result.response.usageMetadata?.totalTokenCount || 0;

        } catch (audioErr) {
            console.error(`❌ Audio fallback failed for ${lessonTitle}:`, audioErr);
            generatedContent = {
                content: "Could not analyze video content (No transcript & Audio failed).",
                notes: "N/A",
                quiz_data: { questions: [] }
            };
        } finally {
            // Cleanup logic
            if (audioPath && fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
            }
        }
    }

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

        // Use configured model
        const model = genAI.getGenerativeModel({ model: COURSE_DEFAULTS.AI_MODEL });

        let totalTokens = 0;

        sendEvent('progress', { percent: 10, message: `Analyzing topic: "${topic}"...` });

        // Step 1: Determine Structure
        let structure;
        try {
            const prompt = `
            Analyze the topic: "${topic}".
            Is this a "Small Topic" (can be explained in ${COURSE_DEFAULTS.SMALL_TOPIC_LESSONS} video) or a "Big Topic" (needs a roadmap of ${COURSE_DEFAULTS.BIG_TOPIC_MIN_LESSONS}-${COURSE_DEFAULTS.BIG_TOPIC_MAX_LESSONS} sub-modules)?
            
            Return JSON:
            {
                "type": "small" | "big",
                "lessons": [ "Lesson Title 1" ] // If small, just ${COURSE_DEFAULTS.SMALL_TOPIC_LESSONS} title. If big, ${COURSE_DEFAULTS.BIG_TOPIC_MIN_LESSONS}-${COURSE_DEFAULTS.BIG_TOPIC_MAX_LESSONS} lesson titles.
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
        const lessonsToProcess = structure.lessons.slice(0, COURSE_DEFAULTS.MAX_LESSONS_PER_COURSE);

        sendEvent('progress', { percent: 30, message: `Starting parallel generation for ${lessonsToProcess.length} lessons...` });

        // PARALLEL EXECUTION
        const lessonPromises = lessonsToProcess.map(async (lessonTitle: string, index: number) => {
            try {
                // Process
                const lessonData = await processLesson(topic, lessonTitle, model);
                // Return with index to preserve order if needed (Promise.all preserves order anyway)
                return { ...lessonData, index };
            } catch (err) {
                console.error(`Error in lesson ${lessonTitle}:`, err);
                return null;
            }
        });

        const results = await Promise.all(lessonPromises);

        sendEvent('progress', { percent: 80, message: "Saving lessons to database..." });

        for (let i = 0; i < results.length; i++) {
            const lessonData = results[i];
            if (!lessonData) continue;

            // Accumulate tokens
            // @ts-ignore
            if (lessonData.tokens) totalTokens += lessonData.tokens;

            const { rows } = await pool.query(
                'INSERT INTO lessons (course_id, title, content, order_index, videos, quiz_data, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [
                    courseId,
                    lessonData.title,
                    lessonData.content,
                    i, // Use loop index to ensure correct order_index in DB
                    JSON.stringify(lessonData.videos),
                    JSON.stringify(lessonData.quiz_data),
                    lessonData.notes
                ]
            );
            savedLessons.push(rows[0]);
        }

        sendEvent('progress', { percent: 100, message: "Finalizing course..." });

        // Send Usage Stats
        sendEvent('usage', { totalTokens, model: COURSE_DEFAULTS.AI_MODEL });

        // Persist usage to DB
        if (req.user && req.user.id) {
            try {
                await pool.query(
                    'INSERT INTO usage_logs (user_id, course_id, tokens, model) VALUES ($1, $2, $3, $4)',
                    [req.user.id, courseId, totalTokens, COURSE_DEFAULTS.AI_MODEL]
                );
            } catch (dbErr) {
                console.error("Failed to save usage log:", dbErr);
            }
        }

        sendEvent('complete', { success: true, lessons: savedLessons });
        res.end();

    } catch (error: any) {
        console.error("Generation error:", error);
        res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Server error' })}\n\n`);
        res.end();
    }
};
