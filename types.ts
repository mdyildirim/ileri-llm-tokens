
export enum AppState {
    Initial,
    MappingColumns,
    ReadyToRun,
    Running,
    ShowingResults,
}

export interface DatasetRow {
    id: string;
    en: string;
    tr: string;
    tr_nodia: string;
    type: string;
}

export interface ResultRow {
    id: string;
    provider: string;
    model: string;
    variant: 'en' | 'tr' | 'tr_nodia';
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    mode: 'real' | 'error';
    cost: number;
    responseTime: number;
    error?: string;
}

export interface Provider {
    id: string;
    name: string;
    countTokens: (text: string, apiKey: string, model: string) => Promise<{
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        mode: 'real' | 'error';
        cost: number;
        responseTime: number;
        error?: string;
    }>;
}

export interface ProviderSetting {
    enabled: boolean;
    apiKey: string;
    models: string[];
    remember: boolean;
}

export interface ProviderSettingsData {
    openai: ProviderSetting;
    gemini: ProviderSetting;
    anthropic: ProviderSetting;
    grok: ProviderSetting;
}

export interface AppSettings {
    concurrency: number;
    delay: number;
    runFirstN: number;
    regenerateTrNodia: boolean;
}

export interface ToastMessage {
    id: number;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
}