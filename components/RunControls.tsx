
import React from 'react';
import { AppState, AppSettings, ProviderSettingsData, ProviderSetting, Translations } from '../types';
import { PRICING_DATA } from '../services/llmProviders';

interface RunControlsProps {
    settings: AppSettings;
    onSettingsChange: (settings: Partial<AppSettings>) => void;
    onRun: () => void;
    onCancel: () => void;
    onReset: () => void;
    appState: AppState;
    datasetSize: number;
    providerSettings: ProviderSettingsData;
    t: Translations;
}

export const RunControls: React.FC<RunControlsProps> = ({ settings, onSettingsChange, onRun, onCancel, onReset, appState, datasetSize, providerSettings, t }) => {
    const isRunning = appState === AppState.Running;

    const estimatedCost = () => {
        const rows = settings.runFirstN > 0 ? Math.min(settings.runFirstN, datasetSize) : datasetSize;
        if (rows === 0) return '$0.00';
        
        let totalCost = 0;
        const avgPromptTokens = 50; // A rough average for estimation
        const avgCompletionTokens = 2; // We only expect "OK"

        Object.values(providerSettings).forEach((provider: ProviderSetting) => {
            if (provider.enabled) {
                provider.models.forEach(model => {
                    if (model.trim() === '') return;
                    
                    const priceKey = Object.keys(PRICING_DATA).find(key => model.startsWith(key));
                    const pricing = priceKey ? PRICING_DATA[priceKey] : null;

                    if (pricing) {
                        const inputCost = (avgPromptTokens / 1_000_000) * pricing.input;
                        const outputCost = (avgCompletionTokens / 1_000_000) * pricing.output;
                        totalCost += (inputCost + outputCost) * rows * 3; // *3 for en, tr, tr_nodia variants
                    }
                });
            }
        });
        
        if (totalCost === 0) return '$0.00';
        return `~$${totalCost.toFixed(4)}`;
    };

    return (
        <div className="p-6 bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg backdrop-blur-sm border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.run.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="concurrency" className="block text-sm font-medium text-bunker-700 dark:text-bunker-300">{t.run.concurrency}</label>
                    <input type="range" min="1" max="10" value={settings.concurrency} onChange={(e) => onSettingsChange({ concurrency: parseInt(e.target.value) })} disabled={isRunning} id="concurrency" className="w-full h-2 bg-bunker-200 rounded-lg appearance-none cursor-pointer dark:bg-bunker-700" />
                    <span className="text-sm text-bunker-500 dark:text-bunker-400">{settings.concurrency} {t.run.parallel}</span>
                </div>
                <div>
                    <label htmlFor="delay" className="block text-sm font-medium text-bunker-700 dark:text-bunker-300">{t.run.delay}</label>
                    <input type="range" min="0" max="1000" step="50" value={settings.delay} onChange={(e) => onSettingsChange({ delay: parseInt(e.target.value) })} disabled={isRunning} id="delay" className="w-full h-2 bg-bunker-200 rounded-lg appearance-none cursor-pointer dark:bg-bunker-700" />
                    <span className="text-sm text-bunker-500 dark:text-bunker-400">{settings.delay} {t.run.ms}</span>
                </div>
                <div className="sm:col-span-2">
                    <label htmlFor="runFirstN" className="block text-sm font-medium text-bunker-700 dark:text-bunker-300">{t.run.rows}</label>
                    <input type="number" value={settings.runFirstN} onChange={(e) => onSettingsChange({ runFirstN: parseInt(e.target.value) || 0 })} disabled={isRunning} id="runFirstN" placeholder={t.run.allRows.replace('{{count}}', datasetSize.toString())} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-bunker-300 dark:border-bunker-600 bg-white dark:bg-bunker-800 dark:text-bunker-200 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md" />
                </div>
                <div className="sm:col-span-2 flex items-center">
                    <input type="checkbox" id="regenerate-tr-nodia" checked={settings.regenerateTrNodia} onChange={(e) => onSettingsChange({ regenerateTrNodia: e.target.checked })} disabled={isRunning} className="h-4 w-4 rounded border-bunker-300 text-sky-600 focus:ring-sky-500"/>
                    <label htmlFor="regenerate-tr-nodia" className="ml-2 block text-sm text-bunker-600 dark:text-bunker-400">{t.run.regenerate}</label>
                </div>
            </div>
            <div className="mt-6 p-3 bg-sky-100 dark:bg-sky-500/10 rounded-lg text-center text-sm">
                <p className="text-sky-800 dark:text-sky-200"><strong>{t.run.costNote}</strong> {t.run.estimate} <strong>{estimatedCost()}</strong>. </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                {appState !== AppState.Running ? (
                    <button onClick={onRun} className="flex-1 px-6 py-3 rounded-lg text-white font-semibold bg-sky-600 hover:bg-sky-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
                        {t.run.start}
                    </button>
                ) : (
                    <button onClick={onCancel} className="flex-1 px-6 py-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
                        {t.run.cancel}
                    </button>
                )}
                <button onClick={onReset} disabled={isRunning} className="flex-1 px-6 py-3 rounded-lg font-semibold text-bunker-700 dark:text-bunker-200 bg-bunker-200 dark:bg-bunker-700 hover:bg-bunker-300 dark:hover:bg-bunker-600 disabled:opacity-50 transition-colors">
                    {t.run.reset}
                </button>
            </div>
        </div>
    );
};
