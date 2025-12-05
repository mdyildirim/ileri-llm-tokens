

import { Provider, ToastMessage } from '../types';

export const PRICING_DATA: Record<string, { input: number; output: number; note?: string }> = {
    
    //  OpenAI Real Models
    'gpt-5.1': { input: 1.25, output: 10.00, note: 'Exact price' },
    'gpt-5-mini': { input: 0.25, output: 2.00, note: 'Exact price' },
    'gpt-5-nano': { input: 0.05, output: 0.20, note: 'Estimated price' },
    'gpt-5': { input: 1.25, output: 10.00, note: 'Exact price' },
    
    // Google Gemini
    'gemini-2.5-pro': { input: 1.25, output: 10.00, note: 'Exact price' },
    'gemini-2.5-flash': { input: 0.30, output: 2.50, note: 'Exact price' },

    // Anthropic
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-4-opus': { input: 15.00, output: 75.00 },
    
    // xAI Grok
    'grok-4': { input: 3.00, output: 15.00 },
    'grok-4-latest': { input: 3.00, output: 15.00 },
    'grok-4-fast-non-reasoning': { input: 0.20, output: 0.50 },
};

// --- Standardized Test Conditions ---
// These constants ensure every LLM is running under identical constraints
// to make the token benchmark fair.
const TEST_SYSTEM_PROMPT = 'You are a helpful assistant. Reply ONLY with this EXACT phrase, nothing else: Once there was a big blue elephant - it was such a big, such an heavy elephant!';
const TEST_MAX_TOKENS = 50; 
const TEST_TEMPERATURE = 0; 

const calculateCost = (model: string, prompt_tokens: number, completion_tokens: number): number => {
    // Sort keys by length descending to match specific models first (e.g. 'gpt-5-mini' before 'gpt-5')
    const sortedKeys = Object.keys(PRICING_DATA).sort((a, b) => b.length - a.length);
    const priceKey = sortedKeys.find(key => model.startsWith(key));
    const pricing = priceKey ? PRICING_DATA[priceKey] : null;

    if (!pricing) {
        return 0;
    }

    // Sanitize inputs to avoid NaN
    const p_tokens = Number.isFinite(prompt_tokens) ? prompt_tokens : 0;
    const c_tokens = Number.isFinite(completion_tokens) ? completion_tokens : 0;

    const inputCost = (p_tokens / 1_000_000) * pricing.input;
    const outputCost = (c_tokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
};

const ERROR_RESULT = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    output_text: '',
    mode: 'error' as const,
    cost: 0,
    responseTime: 0,
};

// Helper to safely extract error message from various API error formats
const getAPIErrorMessage = (errorData: any): string => {
    try {
        if (!errorData) return 'Unknown error';
        if (typeof errorData === 'string') return errorData;
        
        // Check for 'error' object or string
        if (errorData.error) {
            const e = errorData.error;
            if (typeof e === 'string') return e;
            
            // OpenAI standard: error.message
            if (e.message) {
                let msg = typeof e.message === 'string' ? e.message : JSON.stringify(e.message);
                // Append type or code if available for debugging
                if (e.type) msg += ` (Type: ${e.type})`;
                if (e.code) msg += ` (Code: ${e.code})`;
                return msg;
            }
            return JSON.stringify(e);
        }
        
        // Check for direct 'message' property
        if (errorData.message) return typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
        
        // Fallback to stringifying the whole object
        return JSON.stringify(errorData);
    } catch (e) {
        return 'Error parsing error details';
    }
};

export const getProviders = (addToast: (message: Omit<ToastMessage, 'id'>) => void): Provider[] => [
    {
        id: 'openai',
        name: 'OpenAI',
        async countTokens(text, apiKey, model, signal) {
            if (!apiKey) {
                return { ...ERROR_RESULT, error: 'API key is missing.' };
            }
            
            const startTime = performance.now();
            
            try {
                const url = 'https://api.openai.com/v1/responses';
                
                const isReasoningModel = model === 'gpt-5' || model === 'gpt-5-nano' || model === 'gpt-5-mini';
                
                const requestBody: any = {
                    model: model,
                    input: [
                        {
                            role: 'developer',
                            content: [
                                { type: 'input_text', text: TEST_SYSTEM_PROMPT }
                            ]
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'input_text', text: text }
                            ]
                        }
                    ],
                    text: {
                        format: { type: 'text' },
                        verbosity: 'low'
                    },
                    reasoning: {
                        effort: isReasoningModel ? 'minimal' : 'none',
                        summary: null
                    },
                    tools: [],
                    store: false,
                    include: [
                        'reasoning.encrypted_content'
                    ]
                };

                const customParams = isReasoningModel ? 'Reasoning: minimal, Verbosity: low' : 'Reasoning: none, Verbosity: low';

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody),
                    signal
                });

                if (!response.ok) {
                    let errorData;
                    try { errorData = await response.json(); } catch (e) { }
                    console.error("OpenAI Responses API Error:", errorData);
                    const msg = getAPIErrorMessage(errorData) || `${response.status} ${response.statusText}`;
                    throw new Error(`OpenAI API Error: ${msg}`);
                }

                const data = await response.json();
                
                const usage = data.usage || {};
                const prompt_tokens = usage.input_tokens || 0;
                const completion_tokens = usage.output_tokens || 0;
                const total_tokens = usage.total_tokens || (prompt_tokens + completion_tokens);
                
                let output_text = '';
                if (data.output && Array.isArray(data.output)) {
                    output_text = data.output
                        .map((msg: any) => {
                            if (msg.content && Array.isArray(msg.content)) {
                                return msg.content
                                    .filter((c: any) => c.type === 'output_text')
                                    .map((c: any) => c.text || '')
                                    .join('');
                            }
                            return '';
                        })
                        .join('');
                }

                const cost = calculateCost(model, prompt_tokens, completion_tokens);
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);

                return {
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    output_text,
                    mode: 'real',
                    cost,
                    responseTime,
                    customParams
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const errorMsg = error.name === 'AbortError' 
                    ? 'Request cancelled' 
                    : (error.message.includes('fetch') ? 'Network/CORS error.' : error.message);
                return { ...ERROR_RESULT, error: errorMsg, responseTime };
            }
        }
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        async countTokens(text, apiKey, model, signal) {
            if (!apiKey) {
                const errorMsg = 'API key is missing.';
                return { ...ERROR_RESULT, error: errorMsg };
            }
            const startTime = performance.now();
            try {
                const genAIModule = await import("https://esm.run/@google/genai");
                if (!genAIModule || !genAIModule.GoogleGenAI) {
                    throw new Error('Failed to import GoogleGenAI from @google/genai module.');
                }
                const ai = new genAIModule.GoogleGenAI({ apiKey });
                
                // Configuration Parity Logic for fair benchmark comparison:
                //
                // TEMPERATURE:
                // - Google recommends keeping temperature=1.0 (default) for Gemini 2.5 models.
                // - Setting below 1.0 may cause looping or degraded performance.
                // - For FAIR comparison with OpenAI GPT-5 (which uses default temp=1),
                //   we do NOT set temperature, topP, or topK - using defaults for all.
                //
                // THINKING:
                // - Gemini 2.5 series supports thinkingConfig with thinkingBudget.
                // - We set thinkingBudget=0 to match OpenAI's 'reasoning: minimal' behavior.
                const generationConfig: any = {
                    maxOutputTokens: TEST_MAX_TOKENS,
                    candidateCount: 1,
                    // Use standardized system instruction to match OpenAI's system role
                    systemInstruction: TEST_SYSTEM_PROMPT, 
                    // NOTE: We do NOT set temperature, topP, or topK here.
                    // This uses defaults (temp=1, topP=0.95, topK=40) for fair comparison
                    // with OpenAI models that don't support custom temperature.
                };

                let thinkingInfo = undefined;
                // Thinking Config for Gemini 2.5 series - set to minimal (budget: 0)
                // to match OpenAI's 'reasoning: minimal' for fair comparison.
                if (model.includes('gemini-2.5')) {
                    generationConfig.thinkingConfig = { thinkingBudget: 0 }; 
                    thinkingInfo = 'Thinking Budget: 0';
                }

                const response = await ai.models.generateContent({
                    model: model,
                    contents: text, // Send just the text; system prompt is in config
                    config: generationConfig, 
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                const usage = response.usageMetadata || {};
                const prompt_tokens = usage.promptTokenCount || 0;
                const completion_tokens = usage.candidatesTokenCount || 0;
                const total_tokens = usage.totalTokenCount || (prompt_tokens + completion_tokens);

                const cost = calculateCost(model, prompt_tokens, completion_tokens);
                
                // Robust extraction for Gemini
                let output_text = '';
                try {
                    output_text = response.text || '';
                } catch (e) {
                    // Fallback if getter fails (e.g., safety block or empty content)
                    if (response.candidates?.[0]?.content?.parts) {
                        output_text = response.candidates[0].content.parts.map((p: any) => p.text).join('');
                    } else if (response.candidates?.[0]?.finishReason) {
                         output_text = `[${response.candidates[0].finishReason}]`;
                    }
                }
                
                return {
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    output_text,
                    mode: 'real',
                    cost,
                    responseTime,
                    customParams: thinkingInfo
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                return { ...ERROR_RESULT, error: error.message, responseTime };
            }
        }
    },
    // Stubs for other providers
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        async countTokens(text, apiKey, model, signal) {
             const errorMsg = 'This provider is not implemented yet.';
             return { ...ERROR_RESULT, error: errorMsg };
        }
    },
    {
        id: 'grok',
        name: 'xAI Grok',
        async countTokens(text, apiKey, model, signal) {
            if (!apiKey) {
                const errorMsg = 'API key is missing.';
                return { ...ERROR_RESULT, error: errorMsg };
            }
            const startTime = performance.now();
            try {
                // Grok beta uses max_tokens, but might switch. Keep max_tokens for now unless errors arise.
                const response = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: TEST_SYSTEM_PROMPT },
                            { role: 'user', content: text }
                        ],
                        max_tokens: TEST_MAX_TOKENS,
                        temperature: TEST_TEMPERATURE,
                        stream: false,
                    }),
                    signal
                });

                if (!response.ok) {
                    let errorData;
                    try {
                         errorData = await response.json();
                    } catch (e) {
                         throw new Error(`Grok API Error: ${response.status} ${response.statusText}`);
                    }
                    console.error("Grok API Error:", errorData);
                    throw new Error(`Grok API Error: ${getAPIErrorMessage(errorData)}`);
                }

                const data = await response.json();

                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const usage = data.usage || {};
                
                const prompt_tokens = usage.prompt_tokens || 0;
                const completion_tokens = usage.completion_tokens || 0;
                const total_tokens = usage.total_tokens || (prompt_tokens + completion_tokens);

                const cost = calculateCost(model, prompt_tokens, completion_tokens);
                const output_text = data.choices?.[0]?.message?.content || '';
                
                return {
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    output_text,
                    mode: 'real',
                    cost,
                    responseTime,
                };
            } catch (error: any) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const errorMsg = error.name === 'AbortError' ? 'Request cancelled' : (error.message.includes('fetch') ? 'Network/CORS error.' : error.message);
                return { ...ERROR_RESULT, error: errorMsg, responseTime };
            }
        }
    }
];
