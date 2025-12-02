
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

export interface Translations {
    title: string;
    upload: {
        title: string;
        desc: string;
        choose: string;
        drag: string;
        errorType: string;
        errorEmpty: string;
    };
    mapper: {
        title: string;
        select: string;
        optional: string;
        cancel: string;
        confirm: string;
    };
    settings: {
        title: string;
        apiKey: string;
        remember: string;
        models: string;
        addModel: string;
    };
    run: {
        title: string;
        concurrency: string;
        parallel: string;
        delay: string;
        ms: string;
        rows: string;
        allRows: string;
        regenerate: string;
        costNote: string;
        estimate: string;
        start: string;
        cancel: string;
        reset: string;
    };
    results: {
        title: string;
        waiting: string;
        raw: string;
        totalCost: string;
        exportCsv: string;
        exportJsonl: string;
        table: {
            id: string;
            provider: string;
            model: string;
            variant: string;
            prompt: string;
            completion: string;
            total: string;
            mode: string;
            cost: string;
            time: string;
            error: string;
        };
    };
    charts: {
        title: string;
        noData: string;
        meanTokens: string;
        meanRatios: string;
        avgTime: string;
    };
    analysis: {
        title: string;
        tokens: string;
        time: string;
        cost: string;
    };
    footer: string;
    toasts: {
        noProviders: string;
        noProvidersMsg: string;
        noModels: string;
        noModelsMsg: string;
        runCancelled: string;
        runCancelledMsg: string;
        runComplete: string;
        runCompleteMsg: string;
        datasetUpdate: string;
        datasetUpdateMsg: string;
        revertedMsg: string;
    };
}
