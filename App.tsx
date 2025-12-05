
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ColumnMapper } from './components/ColumnMapper';
import { ProviderSettings } from './components/ProviderSettings';
import { RunControls } from './components/RunControls';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ChartsDisplay } from './components/ChartsDisplay';
import { AnalysisSummary } from './components/AnalysisSummary';
import { Toast, ToastMessage } from './components/Toast';
import { AppState, DatasetRow, ResultRow, Provider, ProviderSettingsData, AppSettings } from './types';
import { getProviders } from './services/llmProviders';
import { toNFC, stripDiacriticsTr, asyncPool } from './utils';
import { DarkModeToggle, GithubIcon, IleriLogo } from './components/Icons';
import { translations } from './translations';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.Initial);
    const [rawData, setRawData] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [dataset, setDataset] = useState<DatasetRow[]>([]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [language, setLanguage] = useState<'en' | 'tr'>('tr'); // Default to TR

    const t = translations[language];

    const [providerSettings, setProviderSettings] = useState<ProviderSettingsData>({
        openai: { enabled: true, apiKey: '', models: ['gpt-5', 'gpt-5-nano'], remember: false },
        gemini: { enabled: true, apiKey: '', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], remember: false },
        anthropic: { enabled: false, apiKey: '', models: ['claude-3-haiku-20240307', 'claude-4-opus'], remember: false },
        grok: { enabled: false, apiKey: '', models: ['grok-4-latest', 'grok-4-fast-non-reasoning'], remember: false },
    });
    
    const [appSettings, setAppSettings] = useState<AppSettings>({
        concurrency: 2,
        delay: 100,
        runFirstN: 0,
        regenerateTrNodia: false,
    });

    const cancelRunRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const storedDarkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(storedDarkMode);
        const storedLang = localStorage.getItem('language') as 'en' | 'tr';
        if (storedLang && (storedLang === 'en' || storedLang === 'tr')) {
            setLanguage(storedLang);
        }
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [isDarkMode]);

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'tr' : 'en';
        setLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    const addToast = (message: Omit<ToastMessage, 'id'>) => {
        setToasts(prev => [...prev, { ...message, id: Date.now() }]);
    };
    
    const handleFileLoaded = (data: Record<string, string>[], fileHeaders: string[]) => {
        setRawData(data);
        setHeaders(fileHeaders);
        setAppState(AppState.MappingColumns);
    };

    const handleColumnMapping = (mapping: { [key: string]: string }) => {
        const newDataset = rawData.map((row, index) => {
            const mappedRow: DatasetRow = {
                id: row[mapping.id] || `row-${index + 1}`,
                en: toNFC(row[mapping.en]),
                tr: toNFC(row[mapping.tr]),
                tr_nodia: mapping.tr_nodia ? toNFC(row[mapping.tr_nodia]) : stripDiacriticsTr(toNFC(row[mapping.tr])),
                type: mapping.type ? row[mapping.type] : 'default'
            };
            return mappedRow;
        });
        setDataset(newDataset);
        setAppState(AppState.ReadyToRun);
    };

    const handleSettingsChange = (newSettings: AppSettings) => {
        setAppSettings(prev => ({...prev, ...newSettings}));
        if (newSettings.regenerateTrNodia !== appSettings.regenerateTrNodia) {
            const regenerated = dataset.map(row => ({
                ...row,
                tr_nodia: newSettings.regenerateTrNodia ? stripDiacriticsTr(row.tr) : (rawData.find(r => r.id === row.id) || {}).tr_nodia || stripDiacriticsTr(row.tr)
            }));
            setDataset(regenerated);
            addToast({ type: 'info', title: t.toasts.datasetUpdate, message: newSettings.regenerateTrNodia ? t.toasts.datasetUpdateMsg : t.toasts.revertedMsg });
        }
    };
    
    const handleRun = async () => {
        const providers = getProviders(addToast);

        // Validation: Check for missing API keys for enabled providers
        const missingKeyProviders = (Object.keys(providerSettings) as Array<keyof ProviderSettingsData>)
            .filter(key => providerSettings[key].enabled && !providerSettings[key].apiKey.trim())
            .map(key => providers.find(p => p.id === key)?.name || key);

        if (missingKeyProviders.length > 0) {
            addToast({ 
                type: 'error', 
                title: t.toasts.missingKey, 
                message: t.toasts.missingKeyMsg.replace('{{providers}}', missingKeyProviders.join(', ')) 
            });
            return;
        }

        setAppState(AppState.Running);
        setResults([]);
        cancelRunRef.current = false;
        abortControllerRef.current = new AbortController();

        const enabledProviders = (Object.keys(providerSettings) as Array<keyof ProviderSettingsData>)
            .filter((id) => providerSettings[id].enabled)
            .map((id) => providers.find(p => p.id === id))
            .filter((p): p is Provider => !!p);

        if (enabledProviders.length === 0) {
            addToast({ type: 'error', title: t.toasts.noProviders, message: t.toasts.noProvidersMsg });
            setAppState(AppState.ReadyToRun);
            return;
        }

        const rowsToProcess = appSettings.runFirstN > 0 ? dataset.slice(0, appSettings.runFirstN) : dataset;

        type Task = { row: DatasetRow; provider: Provider; variant: 'en' | 'tr' | 'tr_nodia'; model: string };
        
        const tasks: Task[] = [];
        for (const row of rowsToProcess) {
            for (const provider of enabledProviders) {
                const setting = providerSettings[provider.id as keyof ProviderSettingsData];
                for (const model of setting.models) {
                    if (model) {
                         tasks.push({ row, provider, variant: 'en', model });
                         tasks.push({ row, provider, variant: 'tr', model });
                         tasks.push({ row, provider, variant: 'tr_nodia', model });
                    }
                }
            }
        }
        
        if (tasks.length === 0) {
            addToast({ type: 'error', title: t.toasts.noModels, message: t.toasts.noModelsMsg });
            setAppState(AppState.ReadyToRun);
            return;
        }

        const runTask = async (task: Task): Promise<ResultRow | undefined> => {
            if (cancelRunRef.current) return undefined;
            const text = task.row[task.variant];
            const chars = text.length;
            
            const apiKey = providerSettings[task.provider.id as keyof ProviderSettingsData].apiKey;
            
            try {
                const result = await task.provider.countTokens(text, apiKey, task.model, abortControllerRef.current?.signal);
                
                const tokens_per_char = chars > 0 ? result.prompt_tokens / chars : 0;
                
                const resultRow: ResultRow = {
                    id: task.row.id,
                    provider: task.provider.name,
                    model: task.model,
                    variant: task.variant,
                    chars,
                    tokens_per_char,
                    ...result
                };
                
                if (resultRow.error && resultRow.error === 'Request cancelled') {
                     return undefined;
                }

                setResults(prev => [...prev, resultRow]);
                return resultRow;
            } catch (e) {
                return undefined;
            }
        };

        try {
            await asyncPool(appSettings.concurrency, tasks, runTask, appSettings.delay, cancelRunRef);
            
            if (cancelRunRef.current) {
                addToast({ type: 'info', title: t.toasts.runCancelled, message: t.toasts.runCancelledMsg });
                setAppState(AppState.ReadyToRun);
            } else {
                addToast({ type: 'success', title: t.toasts.runComplete, message: t.toasts.runCompleteMsg });
                setAppState(AppState.ShowingResults);
            }
        } catch (error) {
             console.error("Run failed", error);
             setAppState(AppState.ReadyToRun);
        }
    };

    const handleCancel = () => {
        cancelRunRef.current = true;
        abortControllerRef.current?.abort();
    };

    const handleReset = () => {
        setAppState(AppState.Initial);
        setDataset([]);
        setResults([]);
        setRawData([]);
        setHeaders([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-bunker-950 transition-colors duration-300">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div className="flex items-center gap-3">
                         <div className="text-sky-500">
                            <IleriLogo />
                         </div>
                         <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-cyan-500 dark:from-sky-400 dark:to-cyan-300">
                            {t.title}
                         </h1>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-bunker-900 p-1.5 rounded-full shadow-sm border border-bunker-200 dark:border-bunker-800">
                         <button onClick={toggleLanguage} className="px-3 py-1 rounded-full bg-bunker-100 dark:bg-bunker-800 text-xs font-bold text-bunker-600 dark:text-bunker-300 hover:bg-bunker-200 dark:hover:bg-bunker-700 transition-colors">
                            {language.toUpperCase()}
                         </button>
                         <div className="w-px h-4 bg-bunker-300 dark:bg-bunker-700"></div>
                         <DarkModeToggle isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                         <div className="w-px h-4 bg-bunker-300 dark:bg-bunker-700"></div>
                         <a href="https://github.com/ileri-ai" target="_blank" rel="noopener noreferrer" className="p-1 text-bunker-500 hover:text-bunker-900 dark:text-bunker-400 dark:hover:text-white transition-colors">
                            <GithubIcon />
                         </a>
                    </div>
                </header>
                
                <main className="space-y-6 pb-20">
                    {appState === AppState.Initial && (
                         <div className="max-w-2xl mx-auto">
                            <FileUpload onFileLoaded={handleFileLoaded} t={t} />
                         </div>
                    )}

                    {appState === AppState.MappingColumns && (
                        <ColumnMapper headers={headers} onMap={handleColumnMapping} onCancel={() => setAppState(AppState.Initial)} t={t} />
                    )}

                    {appState >= AppState.ReadyToRun && (
                        <div className="space-y-6 animate-fade-in">
                            <ProviderSettings settings={providerSettings} onChange={setProviderSettings} disabled={appState === AppState.Running} t={t} />
                            
                            <RunControls 
                                settings={appSettings} 
                                onSettingsChange={handleSettingsChange}
                                onRun={handleRun}
                                onCancel={handleCancel}
                                onReset={handleReset}
                                appState={appState}
                                datasetSize={dataset.length}
                                providerSettings={providerSettings}
                                t={t}
                            />
                            
                            {(results.length > 0 || appState === AppState.Running) && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg border border-white/20 p-6 backdrop-blur-sm">
                                        <ResultsDisplay results={results} t={t} />
                                    </div>
                                    
                                    <div className="bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg border border-white/20 p-6 backdrop-blur-sm">
                                        <ChartsDisplay results={results} isDarkMode={isDarkMode} t={t} />
                                    </div>
                                    
                                    <AnalysisSummary results={results} t={t} />
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-bunker-950/80 backdrop-blur-md border-t border-bunker-200 dark:border-bunker-800 py-3 text-center text-bunker-500 dark:text-bunker-500 text-xs">
                    <div className="container mx-auto">
                        <p>{t.footer}</p>
                    </div>
                </footer>

                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                    <div className="pointer-events-auto">
                        {toasts.map(toast => (
                            <Toast key={toast.id} toast={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
