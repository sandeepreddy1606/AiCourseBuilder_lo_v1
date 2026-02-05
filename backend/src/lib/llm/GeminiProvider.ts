import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMOptions } from './types';
import { COURSE_DEFAULTS } from '../../config/defaults';

export class GeminiProvider implements LLMProvider {
    private model;

    constructor(apiKey: string) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: COURSE_DEFAULTS.LLM.GEMINI_MODEL });
    }

    async generate(prompt: string, options?: LLMOptions): Promise<string> {
        try {
            const generationConfig: any = {};
            if (options?.json) {
                generationConfig.responseMimeType = "application/json";
            }
            if (options?.temperature) {
                generationConfig.temperature = options.temperature;
            }

            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig
            });

            const text = result.response.text();

            // Clean up markdown code blocks if they exist, even if JSON mode is on
            // Gemini sometimes wraps JSON in ```json ... ```
            return text.replace(/```json/g, '').replace(/```/g, '').trim();
        } catch (error) {
            console.error("Gemini Generation Error:", error);
            throw error;
        }
    }
}
