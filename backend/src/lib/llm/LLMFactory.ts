import { LLMProvider } from './types';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';

export class LLMFactory {
    private static instance: LLMProvider;

    static getProvider(): LLMProvider {
        if (this.instance) return this.instance;

        const providerType = process.env.LLM_PROVIDER || 'gemini';

        if (providerType === 'groq') {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) throw new Error("GROQ_API_KEY is not set");
            this.instance = new GroqProvider(apiKey);
            console.log("[LLMFactory] Using Groq Provider");
        } else {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
            this.instance = new GeminiProvider(apiKey);
            console.log("[LLMFactory] Using Gemini Provider");
        }

        return this.instance;
    }
}
