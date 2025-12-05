
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
    chars: number;
    tokens_per_char: number;
    output_chars: number;
    output_tokens_per_char: number;
    output_text?: string;
    mode: 'real' | 'error';
    cost: number;
    responseTime: number;
    error?: string;
    customParams?: string;
}

export interface Provider {
    id: string;
    name: string;
    countTokens: (text: string, apiKey: string, model: string, signal?: AbortSignal) => Promise<{
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        output_text?: string;
        mode: 'real' | 'error';
        cost: number;
        responseTime: number;
        error?: string;
        customParams?: string;
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
            chars: string;
            tokensPerChar: string;
            outputChars: string;
            outputTokPerChar: string;
            output: string;
            mode: string;
            cost: string;
            time: string;
            error: string;
        };
    };
    charts: {
        title: string;
        noData: string;
        cost: string;
        overhead: string;
        avgTime: string;
    };
    analysis: {
        title: string;
        modelCompTitle: string;
        comp: {
            tr_vs_en: string;
            tr_nodia_vs_en: string;
            tr_nodia_vs_tr: string;
        };
        subjects: {
            tr: string;
            tr_nodia: string;
            en: string;
        };
        sentences: {
            usesMoreTokens: string;
            usesFewerTokens: string;
            isSlower: string;
            isFaster: string;
            isMoreExpensive: string;
            isCheaper: string;
            isSame: string;
        };
        table: {
            model: string;
            avgTokens: string;
            tokenSplit: string;
            avgTime: string;
            avgCost: string;
            costSplit: string;
            rates: string;
            input: string;
            output: string;
        }
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
        missingKey: string;
        missingKeyMsg: string;
    };
}
