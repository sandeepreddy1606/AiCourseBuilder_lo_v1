export interface LLMProvider {
    generate(prompt: string, options?: LLMOptions): Promise<string>;
}

export interface LLMOptions {
    temperature?: number;
    json?: boolean; // If true, enforces JSON output
}
