import { GoogleGenerativeAI } from '@google/generative-ai';
import { COURSE_DEFAULTS } from '../config/defaults';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: COURSE_DEFAULTS.AI_MODEL });

export class PlannerAgent {
    async planCurriculum(topic: string, difficulty: string = 'Beginner') {
        console.log(`[PlannerAgent] Planning curriculum for: ${topic} (Difficulty: ${difficulty})`);

        const prompt = `
        You are an Expert Instructional Designer following the **Dick and Carey Systems Approach Model**.
        
        Your task is to design a course curriculum for the topic: "${topic}".
        Target Audience Difficulty Level: **${difficulty}**.
        
        **Instructions based on Difficulty:**
        - **Beginner**: Focus on fundamental concepts, definitions, and basic understanding. Cognitive levels: Remember, Understand.
        - **Intermediate**: Focus on application, analysis, and combining concepts. Cognitive levels: Apply, Analyze.
        - **Advanced**: Focus on complex problem-solving, evaluation, and creation. Cognitive levels: Evaluate, Create.
        
        Step 1: **Instructional Analysis**
        - Identify the "Goal" of this course.
        - Determine the prerequisite skills required.
        - Break the goal into subordinate skills (subtopics).
        
        Step 2: **Performance Objectives**
        - For each subtopic, define what the learner will be able to do.
        - Classify the cognitive level (Bloom's Taxonomy).

        Step 3: **Generate Structure**
        - Based on the analysis, output a JSON structure.
        - Determine if this is a "Small" (1 lesson) or "Big" (3-5 lessons) topic.

        Output **JSON ONLY**:
        {
            "type": "small" | "big",
            "goal": "...",
            "prerequisites": ["..."],
            "lessons": [
                {
                    "title": "Lesson Title (Clear & Actionable)",
                    "objectives": "Learner will be able to...",
                    "cognitive_level": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
                    "search_queries": ["YouTube search query 1"]
                }
            ]
        }
        `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const text = result.response.text();
            // Sanitize
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanText);

            return plan;
        } catch (error) {
            console.error("[PlannerAgent] Error generating plan:", error);
            // Fallback
            return {
                type: 'small',
                goal: `Learn basics of ${topic}`,
                prerequisites: [],
                lessons: [{
                    title: `Introduction to ${topic}`,
                    objectives: "Understand basics",
                    cognitive_level: "understand",
                    search_queries: [`${topic} tutorial`]
                }]
            };
        }
    }
}
