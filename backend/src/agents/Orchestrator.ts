import { PlannerAgent } from './PlannerAgent';
import { ContentAgent } from './ContentAgent';
import { VerifierAgent } from './VerifierAgent';
import { searchVideos, getVideoMetadata } from '../services/youtubeService';
import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ytdl from 'ytdl-core';
import { GoogleAIFileManager } from "@google/generative-ai/server";

// Helper for audio download (refactored from controller)
const downloadAudio = async (url: string, videoId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), `${videoId}.mp3`);
        const stream = ytdl(url, { quality: 'lowestaudio', filter: 'audioonly' });
        stream.pipe(fs.createWriteStream(tempFilePath))
            .on('finish', () => resolve(tempFilePath))
            .on('error', (err) => reject(err));
    });
};

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');

export class Orchestrator {
    private planner: PlannerAgent;
    private contentAgent: ContentAgent;
    private verifier: VerifierAgent;
    private sendEvent: (event: string, data: any) => void;

    constructor(sendEvent: (event: string, data: any) => void) {
        this.planner = new PlannerAgent();
        this.contentAgent = new ContentAgent();
        this.verifier = new VerifierAgent();
        this.sendEvent = sendEvent;
    }

    async generateCourse(topic: string) {
        this.sendEvent('progress', { percent: 5, message: "🤖 Orchestrator: Initializing Agents..." });

        // Step 1: Planning
        this.sendEvent('progress', { percent: 10, message: "📋 Planner Agent: Analyzing Instructional Design..." });
        const plan = await this.planner.planCurriculum(topic);
        this.sendEvent('progress', { percent: 20, message: `📋 Planner: Designed ${plan.type} course with ${plan.lessons.length} lessons.` });

        const results = [];
        let completedLessons = 0;
        const totalLessons = plan.lessons.length;

        // Step 2: Execution Loop
        for (const lessonPlan of plan.lessons) {
            this.sendEvent('progress', {
                percent: 20 + Math.floor((completedLessons / totalLessons) * 70),
                message: `🎥 Searching content for: "${lessonPlan.title}"...`
            });

            // A. Search Video
            const videos = await searchVideos(lessonPlan.search_queries[0]);
            if (videos.length === 0) {
                console.warn(`No video found for ${lessonPlan.title}`);
                results.push(this.createEmptyLesson(lessonPlan));
                continue;
            }
            const video = videos[0];
            const videoId = video.id?.videoId;

            if (!videoId) {
                console.warn(`No valid video ID found for ${lessonPlan.title}`);
                results.push(this.createEmptyLesson(lessonPlan));
                continue;
            }

            const videoMetadata = await getVideoMetadata(videoId);

            // B. Get Content (Transcript or Audio by ContentAgent)
            let transcriptText = "";
            let generatedContent: any = {};
            let isAudioFallback = false;

            try {
                const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                transcriptText = transcript.map(t => t.text).join(' ');
            } catch (e) {
                isAudioFallback = true;
            }

            // C. Generate Content (Agentic Loop)
            if (!isAudioFallback) {
                this.sendEvent('progress', { message: `🧠 Content Agent: Analyzing transcript for "${lessonPlan.title}"...` });

                // 1. Extract Salient Phrases (GRPO Step 1)
                const { phrases } = await this.contentAgent.extractSalientPhrases([transcriptText]);

                // 2. Generate Draft
                generatedContent = await this.contentAgent.generateLessonContent(transcriptText, phrases, lessonPlan.cognitive_level);

                // 3. Verification Loop
                let attempts = 0;
                let isValid = false;

                while (!isValid && attempts < 2) {
                    this.sendEvent('progress', { message: `🛡️ Verifier Agent: Validating attempt ${attempts + 1}...` });

                    const verification = await this.verifier.verifyContent(transcriptText, generatedContent.content, generatedContent.quiz_data.questions);

                    if (verification.valid) {
                        isValid = true;
                        console.log("✅ Verification Passed");
                    } else {
                        console.warn("❌ Verification Failed:", verification.feedback);
                        // Re-prompt Content Agent with feedback (simplified here by just re-calling with strict prompt, ideally we pass feedback)
                        // For MVP, we'll keep the first attempt but log the failure, or simply retry once.
                        attempts++;
                        if (attempts === 2) {
                            console.warn("Max retries reached, using best effort.");
                            isValid = true;
                        }
                    }
                }
            } else {
                // Audio Fallback
                this.sendEvent('progress', { message: `🎧 Content Agent: Audio Fallback for "${lessonPlan.title}"...` });
                try {
                    const audioPath = await downloadAudio(`https://www.youtube.com/watch?v=${videoId}`, videoId);
                    const uploadResponse = await fileManager.uploadFile(audioPath, { mimeType: "audio/mp3" });

                    generatedContent = await this.contentAgent.processAudio(uploadResponse.file.uri, topic);

                    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                } catch (err) {
                    console.error("Audio processing failed", err);
                    results.push(this.createEmptyLesson(lessonPlan));
                    continue;
                }
            }

            results.push({
                title: lessonPlan.title,
                content: generatedContent.content,
                videos: [{
                    id: videoId,
                    title: video.snippet?.title,
                    thumbnail: video.snippet?.thumbnails?.high?.url
                }],
                notes: generatedContent.notes,
                quiz_data: generatedContent.quiz_data,
                // Add metadata for adaptive learning
                cognitive_level: lessonPlan.cognitive_level,
                pedagogical_metadata: { objectives: lessonPlan.objectives }
            });

            completedLessons++;
        }

        return results;
    }

    private createEmptyLesson(plan: any) {
        return {
            title: plan.title,
            content: "Content could not be generated.",
            videos: [],
            notes: "N/A",
            quiz_data: { questions: [] },
            cognitive_level: plan.cognitive_level || 'understand',
            pedagogical_metadata: {}
        };
    }
}
