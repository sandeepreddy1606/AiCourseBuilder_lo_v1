import Groq from 'groq-sdk';
import { LLMProvider, LLMOptions } from './types';

import { COURSE_DEFAULTS } from '../../config/defaults';

export class GroqProvider implements LLMProvider {
    private client: Groq;
    private modelName: string;

    constructor(apiKey: string, modelName: string = COURSE_DEFAULTS.LLM.GROQ_MODEL) {
        this.client = new Groq({ apiKey });
        this.modelName = modelName;
    }

    async generate(prompt: string, options?: LLMOptions): Promise<string> {
        try {
            const result = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.modelName,
                temperature: options?.temperature || 0.7,
                response_format: options?.json ? { type: 'json_object' } : undefined
            });

            const text = result.choices[0]?.message?.content || '';
            return text.trim();
        } catch (error) {
            console.error("Groq Generation Error:", error);
            throw error;
        }
    }
}
