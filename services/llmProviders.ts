
import { Provider, ToastMessage } from '../types';

export const PRICING_DATA: Record<string, { input: number; output: number; note?: string }> = {
    // OpenAI - Prices per 1 million tokens
    // Note: gpt-5 models are speculative and prices are estimates based on current models.
    'gpt-5-pro': { input: 15.00, output: 120.00, note: 'Exact price' },
    'gpt-5': { input: 1.25, output: 10.00, note: 'Exact price' },
    'gpt-5-mini': { input: 0.25, output: 2.00, note: 'Exact price' },
    
    // Google Gemini - Prices per 1 million tokens
    'gemini-2.5-pro': { input: 1.25, output: 10.00, note: 'Exact price' },
    'gemini-2.5-flash': { input: 0.30, output: 2.50, note: 'Exact price' },

    // Fallbacks for other models in UI
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-4-opus': { input: 15.00, output: 75.00 },
    
    // xAI Grok - Prices per 1 million tokens
    'grok-4': { input: 3.00, output: 15.00 },
    'grok-4-latest': { input: 3.00, output: 15.00 },
    'grok-4-fast-non-reasoning': { input: 0.20, output: 0.50 },
};

const calculateCost = (model: string, prompt_tokens: number, completion_tokens: number): number => {
    const priceKey = Object.keys(PRICING_DATA).find(key => model.startsWith(key));
    const pricing = priceKey ? PRICING_DATA[priceKey] : null;

    if (!pricing) {
        return 0;
    }

    const inputCost = (prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (completion_tokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
};

const createPrompt = (text: string) => `System: You are a helpful assistant. Reply only with OK.
User: ${text}`;

const ERROR_RESULT = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    mode: 'error' as const,
    cost: 0,
    responseTime: 0,
};

export const getProviders = (addToast: (message: Omit<ToastMessage, 'id'>) => void): Provider[] => [
    {
        id: 'openai',
        name: 'OpenAI',
        async countTokens(text, apiKey, model) {
            if (!apiKey) {
                const errorMsg = 'API key is missing.';
                addToast({ type: 'warning', title: 'OpenAI Error', message: `${errorMsg} Skipping request.` });
                return { ...ERROR_RESULT, error: errorMsg };
            }
            const startTime = performance.now();
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant. \n\nReply only with OK.' },
                            { role: 'user', content: `${text}` }
                        ],
                        max_completion_tokens: 10
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`OpenAI API Error: ${errorData.error.message}`);
                }

                const data = await response.json();
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const usage = data.usage;
                const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
                return {
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                    total_tokens: usage.total_tokens,
                    mode: 'real',
                    cost,
                    responseTime,
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const errorMsg = error.message.includes('fetch') ? 'Network/CORS error.' : error.message;
                addToast({ type: 'error', title: 'OpenAI Error', message: errorMsg });
                return { ...ERROR_RESULT, error: errorMsg, responseTime };
            }
        }
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        async countTokens(text, apiKey, model) {
            if (!apiKey) {
                const errorMsg = 'API key is missing.';
                addToast({ type: 'warning', title: 'Gemini Error', message: `${errorMsg} Skipping request.` });
                return { ...ERROR_RESULT, error: errorMsg };
            }
            const startTime = performance.now();
            try {
                const genAIModule = await import("https://esm.run/@google/genai");
                if (!genAIModule || !genAIModule.GoogleGenAI) {
                    throw new Error('Failed to import GoogleGenAI from @google/genai module.');
                }
                const ai = new genAIModule.GoogleGenAI({ apiKey });
                
                const response = await ai.models.generateContent({
                    model: model,
                    contents: createPrompt(text),
                    generationConfig: {
                        maxOutputTokens: 10,
                    }
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const usage = response.usageMetadata;

                if (!usage) {
                     const errorMsg = 'Could not retrieve usage data from Gemini API response.';
                     addToast({ type: 'warning', title: 'Gemini Warning', message: errorMsg });
                     return { ...ERROR_RESULT, error: errorMsg, responseTime };
                }
                
                const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);
                
                return {
                    prompt_tokens: usage.promptTokenCount,
                    completion_tokens: usage.candidatesTokenCount,
                    total_tokens: usage.totalTokenCount, 
                    mode: 'real',
                    cost,
                    responseTime,
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                addToast({ type: 'error', title: 'Gemini Error', message: error.message });
                return { ...ERROR_RESULT, error: error.message, responseTime };
            }
        }
    },
    // Stubs for other providers
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        async countTokens(text, apiKey, model) {
             const errorMsg = 'This provider is not implemented yet.';
             addToast({ type: 'info', title: 'Anthropic', message: errorMsg });
             return { ...ERROR_RESULT, error: errorMsg };
        }
    },
    {
        id: 'grok',
        name: 'xAI Grok',
        async countTokens(text, apiKey, model) {
            if (!apiKey) {
                const errorMsg = 'API key is missing.';
                addToast({ type: 'warning', title: 'Grok Error', message: `${errorMsg} Skipping request.` });
                return { ...ERROR_RESULT, error: errorMsg };
            }
            const startTime = performance.now();
            try {
                const response = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant. \n\nReply only with OK.' },
                            { role: 'user', content: text }
                        ],
                        max_tokens: 10,
                        temperature: 0,
                        stream: false,
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    const message = errorData.error?.message || JSON.stringify(errorData);
                    throw new Error(`Grok API Error: ${message}`);
                }

                const data = await response.json();
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const usage = data.usage;

                if (!usage) {
                     const errorMsg = 'Could not retrieve usage data from Grok API response.';
                     addToast({ type: 'warning', title: 'Grok Warning', message: errorMsg });
                     return { ...ERROR_RESULT, error: errorMsg, responseTime };
                }
                
                const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
                
                return {
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                    total_tokens: usage.total_tokens,
                    mode: 'real',
                    cost,
                    responseTime,
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const errorMsg = error.message.includes('fetch') ? 'Network/CORS error.' : error.message;
                addToast({ type: 'error', title: 'Grok Error', message: errorMsg });
                return { ...ERROR_RESULT, error: errorMsg, responseTime };
            }
        }
    }
];
