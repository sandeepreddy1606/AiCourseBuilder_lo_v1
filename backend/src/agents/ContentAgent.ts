import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { COURSE_DEFAULTS } from '../config/defaults';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: COURSE_DEFAULTS.AI_MODEL });

export class ContentAgent {

    // Step 1: Topic-Guided Summarization (GRPO Logic Phase 1)
    async extractSalientPhrases(transcripts: string[]) {
        const combinedText = transcripts.join('\n').slice(0, 30000);
        const prompt = `
        Analyze the following transcripts. Extract a list of **Salient Topic Phrases**.
        These are the core technical terms, concepts, and definitions that MUST be covered.
        
        Output JSON: { "phrases": ["term1", "term2"] }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: combinedText }, { text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
    }

    // Step 2: Generate Content from Phrases
    async generateLessonContent(transcript: string, salientPhrases: string[], cognitiveLevel: string) {
        console.log(`[ContentAgent] Generating content for level: ${cognitiveLevel}`);

        const prompt = `
        You are an Expert Educator. 
        Target Cognitive Level: **${cognitiveLevel.toUpperCase()}** (Bloom's Taxonomy).
        
        **Source Material:**
        "${transcript.slice(0, 20000)}..."
        
        **Mandatory Salient Phrases to Include:**
        ${JSON.stringify(salientPhrases)}

        Tasks:
        1. **Summary**: Write a detailed summary maximizing coverage of the salient phrases. Avoid redundancy.
        2. **Notes**: Structured markdown notes.
        3. **Quiz**: Create ${COURSE_DEFAULTS.QUIZ_QUESTION_COUNT} questions.
           - **Experts-Informed Distractors**:
             - Use "Opposite Facts" (invert true logic).
             - Use "Incorrect Combinations" (mix true concepts incorrectly).
             - DO NOT use simple synonyms or random words.
        
        Output JSON:
        {
            "content": "Detailed summary...",
            "notes": "Markdown notes...",
            "quiz_data": { 
                "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0 } ] 
            }
        }
        `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });
            return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (e) {
            console.error("Content Generation Error", e);
            throw e;
        }
    }

    // Audio Fallback with Technical Jargon Injection
    async processAudio(audioUri: string, topic: string) {
        // "Fine-tuning" via prompt injection for technical terms
        const prompt = `
        Listen to this audio about "${topic}".
        
        **Context**: This is a technical course. Pay special attention to:
        - Alphanumeric serial numbers.
        - Domain-specific terminology (Fintech, Engineering, etc.).
        - Acronyms.
        
        Generate the same JSON structure as standard text processing (content, notes, quiz_data).
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: "audio/mp3",
                    fileUri: audioUri
                }
            },
            { text: prompt }
        ]);

        return JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
    }
}
