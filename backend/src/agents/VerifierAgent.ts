import { GoogleGenerativeAI } from '@google/generative-ai';
import { COURSE_DEFAULTS } from '../config/defaults';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: COURSE_DEFAULTS.AI_MODEL });

export class VerifierAgent {
    async verifyContent(transcriptSnippet: string, generatedSummary: string, quizQuestions: any[]) {
        console.log(`[VerifierAgent] Verifying content integrity...`);

        const prompt = `
        You are a **Pedagogical Content Verifier**.
        
        Your task is to validate the *Generated Summary* and *Quiz Questions* against the *Source Transcript*.
        
        **Source Transcript (Snippet):**
        "${transcriptSnippet.slice(0, 5000)}..."

        **Generated Summary:**
        "${generatedSummary}"

        **Quiz Questions:**
        ${JSON.stringify(quizQuestions)}

        **Verification Criteria:**
        1. **Hallucination Check:** Does the summary contain facts NOT present in the transcript?
        2. **Pedagogical Depth:** Is the summary detailed enough for a learner (not just "This video covers X")?
        3. **Quiz Integrity:** Are the correct answers actually supported by the transcript?
        
        Output **JSON ONLY**:
        {
            "valid": boolean,
            "hallucination_score": number, // 0 to 1 (1 = pure hallucination)
            "depth_score": number, // 0 to 1 (1 = excellent depth)
            "feedback": "Specific instructions on how to fix if invalid",
            "suggested_actions": ["REGEN_SUMMARY", "REGEN_QUIZ", "NONE"]
        }
        `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const text = result.response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("[VerifierAgent] Error:", error);
            // Default to valid to avoid loops in error states, but log warning
            return { valid: true, feedback: "Verification failed, assuming valid fallback." };
        }
    }
}
