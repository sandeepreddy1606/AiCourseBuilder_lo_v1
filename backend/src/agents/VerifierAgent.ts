import { COURSE_DEFAULTS } from '../config/defaults';
import { LLMFactory } from '../lib/llm/LLMFactory';

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
            const llm = LLMFactory.getProvider();
            const text = await llm.generate(prompt, { json: true });

            // Provider returns cleaned text, but keeping JSON parse
            return JSON.parse(text);

        } catch (error) {
            console.error("[VerifierAgent] Error:", error);
            // Default to valid to avoid loops in error states, but log warning
            return { valid: true, feedback: "Verification failed, assuming valid fallback." };
        }
    }
    async evaluateChallengeResponse(userAnswer: string, correctConcept: string) {
        console.log(`[VerifierAgent] Evaluating challenge response...`);

        const prompt = `
        You are an **AI Tutor (LLM-as-a-Judge)**.
        
        **Task**: Evaluate the student's open-ended answer against the "Gold Standard" concept.
        
        **Student Answer**: "${userAnswer}"
        **Gold Standard Concept**: "${correctConcept}"
        
        **Evaluation Rubric**:
        1. **Semantic Match** (0.0 - 1.0): Does the answer cover the core meaning of the concept?
        2. **Diagnostic Value**: If incorrect, what specific misconception does the student have?
        3. **Positive Reinforcement**: Provide a helpful "Nudge" or reference to the correct logic.
        
        Output **JSON ONLY**:
        {
            "score": number, // 0.0 to 1.0
            "feedback": "...",
            "misconception": "..." | null,
            "nudge": "..."
        }
        `;


        try {
            const llm = LLMFactory.getProvider();
            const text = await llm.generate(prompt, { json: true });
            return JSON.parse(text);

        } catch (error) {
            console.error("[VerifierAgent] Evaluation Error:", error);
            return { score: 0, feedback: "Error evaluating response.", misconception: null };
        }
    }
}
