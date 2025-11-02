
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

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.Initial);
    const [rawData, setRawData] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [dataset, setDataset] = useState<DatasetRow[]>([]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [providerSettings, setProviderSettings] = useState<ProviderSettingsData>({
        openai: { enabled: true, apiKey: '', models: ['gpt-5-pro', 'gpt-5', 'gpt-5-mini'], remember: false },
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

    useEffect(() => {
        const storedDarkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(storedDarkMode);
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
            addToast({ type: 'info', title: 'Dataset Updated', message: `tr_nodia column has been ${newSettings.regenerateTrNodia ? 're-generated' : 'reverted'}.` });
        }
    };
    
    const handleRun = async () => {
        setAppState(AppState.Running);
        setResults([]);
        cancelRunRef.current = false;

        const providers = getProviders(addToast);
        const enabledProviders = (Object.keys(providerSettings) as Array<keyof ProviderSettingsData>)
            .filter((id) => providerSettings[id].enabled)
            .map((id) => providers.find(p => p.id === id))
            .filter((p): p is Provider => !!p);

        if (enabledProviders.length === 0) {
            addToast({ type: 'error', title: 'No Providers', message: 'Please enable at least one provider to run the benchmark.' });
            setAppState(AppState.ReadyToRun);
            return;
        }

        const rowsToProcess = appSettings.runFirstN > 0 ? dataset.slice(0, appSettings.runFirstN) : dataset;

        type Task = { row: DatasetRow; provider: Provider; variant: 'en' | 'tr' | 'tr_nodia', model: string };
        const tasks: Task[] = [];
        for (const row of rowsToProcess) {
            for (const provider of enabledProviders) {
                const settings = providerSettings[provider.id as keyof ProviderSettingsData];
                for (const model of settings.models) {
                    if (model.trim() === '') continue;
                    tasks.push({ row, provider, variant: 'en', model });
                    tasks.push({ row, provider, variant: 'tr', model });
                    tasks.push({ row, provider, variant: 'tr_nodia', model });
                }
            }
        }
        
        if (tasks.length === 0) {
            addToast({ type: 'warning', title: 'No Models', message: 'Please add at least one model to an enabled provider.' });
            setAppState(AppState.ReadyToRun);
            return;
        }

        let completed = 0;
        const total = tasks.length;

        const processTask = async (task: Task) => {
            if (cancelRunRef.current) return;
            
            const { row, provider, variant, model } = task;
            const text = row[variant];
            if (!text) return; // Skip empty text fields

            const settings = providerSettings[provider.id as keyof ProviderSettingsData];
            const result = await provider.countTokens(text, settings.apiKey, model);
            
            if (!cancelRunRef.current) {
                setResults(prev => [...prev, {
                    id: row.id,
                    provider: provider.name,
                    model: model,
                    variant: variant,
                    ...result,
                }]);
            }
            completed++;
            const progressBar = document.getElementById('progress-bar-inner');
            if (progressBar) progressBar.style.width = `${(completed / total) * 100}%`;
        };

        await asyncPool(appSettings.concurrency, tasks, processTask, appSettings.delay, cancelRunRef);

        if (cancelRunRef.current) {
            addToast({ type: 'warning', title: 'Run Cancelled', message: 'The benchmark run was cancelled by the user.' });
            setAppState(AppState.ReadyToRun);
        } else {
            addToast({ type: 'success', title: 'Run Complete', message: 'Benchmark finished successfully.' });
            setAppState(AppState.ShowingResults);
        }
    };
    
    const handleCancel = () => {
        cancelRunRef.current = true;
    };
    
    const handleReset = () => {
        setAppState(AppState.Initial);
        setRawData([]);
        setHeaders([]);
        setDataset([]);
        setResults([]);
    };

    const renderContent = () => {
        switch(appState) {
            case AppState.Initial:
                return <FileUpload onFileLoaded={handleFileLoaded} />;
            case AppState.MappingColumns:
                return <ColumnMapper headers={headers} onMap={handleColumnMapping} onCancel={() => setAppState(AppState.Initial)} />;
            case AppState.ReadyToRun:
            case AppState.Running:
            case AppState.ShowingResults:
                return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ProviderSettings settings={providerSettings} onChange={setProviderSettings} disabled={appState === AppState.Running} />
                            <RunControls settings={appSettings} onSettingsChange={handleSettingsChange} onRun={handleRun} onCancel={handleCancel} onReset={handleReset} appState={appState} datasetSize={dataset.length} providerSettings={providerSettings} />
                        </div>
                        {(appState === AppState.Running || results.length > 0) &&
                            <div className="p-4 sm:p-6 bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg backdrop-blur-sm border border-white/20">
                                <h2 className="text-2xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">Results</h2>
                                {appState === AppState.Running && (
                                    <div className="w-full bg-bunker-200 dark:bg-bunker-700 rounded-full h-4 mb-4 overflow-hidden">
                                        <div id="progress-bar-inner" className="bg-sky-500 h-4 rounded-full transition-all duration-300" style={{ width: '0%' }}></div>
                                    </div>
                                )}
                                {appState === AppState.ShowingResults && results.length > 0 && <AnalysisSummary results={results} />}
                                <ResultsDisplay results={results} />
                                {appState === AppState.ShowingResults && results.length > 0 && <ChartsDisplay results={results} isDarkMode={isDarkMode} />}
                            </div>
                        }
                    </div>
                );
            default:
                return <p>Loading...</p>;
        }
    };

    return (
        <div className={`min-h-screen bg-bunker-50 dark:bg-bunker-950 bg-gradient-to-br from-bunker-50 to-slate-100 dark:from-bunker-950 dark:to-slate-900 ${isDarkMode ? 'dark' : ''}`}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-12">
                <header className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-bunker-900 dark:text-bunker-50 tracking-tight">LLM Tokenizer Benchmark</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="https://github.com/google/generative-ai-docs" target="_blank" rel="noopener noreferrer" aria-label="Github Repository" className="text-bunker-500 dark:text-bunker-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
                            <GithubIcon />
                        </a>
                        <DarkModeToggle isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                    </div>
                </header>
                
                <main>
                    {renderContent()}
                </main>

                <footer className="text-center mt-12 text-bunker-500 dark:text-bunker-400 text-sm">
                    <a href="https://ileri.org.tr" target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-2 mb-4 group">
                        <IleriLogo />
                        <span className="text-2xl font-bold tracking-wider text-bunker-800 dark:text-bunker-100 transition-colors group-hover:text-sky-500 dark:group-hover:text-sky-400">İLERİ</span>
                    </a>
                    <p>Built for client-side analysis. API keys are stored in your browser's memory or localStorage only.</p>
                </footer>

                <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
                    {toasts.map(toast => (
                        <Toast key={toast.id} toast={toast} onClose={() => setToasts(t => t.filter(item => item.id !== toast.id))} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default App;
