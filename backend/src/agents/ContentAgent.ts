import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { COURSE_DEFAULTS } from '../config/defaults';
import { LLMFactory } from '../lib/llm/LLMFactory';

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

        const llm = LLMFactory.getProvider();
        const text = await llm.generate(combinedText + "\n\n" + prompt, { json: true });
        return JSON.parse(text);
    }

    // Step 2: Generate Content from Phrases
    async generateLessonContent(transcript: string, salientPhrases: string[], cognitiveLevel: string, difficultyMode: string = 'Standard') {
        console.log(`[ContentAgent] Generating content for level: ${cognitiveLevel}, Mode: ${difficultyMode}`);

        let difficultyInstruction = "";
        if (difficultyMode === 'Remedial') {
            difficultyInstruction = "**ADAPTATION: REMEDIAL MODE**. Simplify all technical jargon. Use concrete analogies for every abstract concept. Focus on foundations.";
        } else if (difficultyMode === 'Advanced') {
            difficultyInstruction = "**ADAPTATION: ADVANCED MODE**. Skip basic definitions. Focus on synthesis, critique, and real-world application. Assume prior knowledge.";
        }

        const prompt = `
        You are an Expert Educator. 
        Target Cognitive Level: **${cognitiveLevel.toUpperCase()}** (Bloom's Taxonomy).
        ${difficultyInstruction}
        
        **Source Material:**
        "${transcript.slice(0, 20000)}..."
        
        **Mandatory Salient Phrases to Include:**
        ${JSON.stringify(salientPhrases)}

        Tasks:
        1. **Summary**: Write a detailed summary maximizing coverage of the salient phrases. Avoid redundancy.
        2. **Notes**: Structured markdown notes.
        3. **Quiz**: Create ${COURSE_DEFAULTS.QUIZ_QUESTION_COUNT} questions.
           - **Experts-Informed Distractors**: Use "Opposite Facts" and "Incorrect Combinations".
        4. **Deep Thinking Challenge**: Create ONE open-ended question that requires synthesis or application of concepts. It must NOT be a simple fact recall.
        
        Output JSON:
        {
            "content": "Detailed summary...",
            "notes": "Markdown notes...",
            "quiz_data": { 
                "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0 } ] 
            },
            "challenge_question": {
                "question": "...",
                "key_concept": "The core concept the user should mention in their answer."
            }
        }
        `;

        try {
            const llm = LLMFactory.getProvider();
            const text = await llm.generate(prompt, { json: true });
            return JSON.parse(text);
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
        
        Generate the same JSON structure as standard text processing (content, notes, quiz_data, challenge_question).
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
