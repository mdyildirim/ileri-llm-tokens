
import React, { useEffect, useState } from 'react';
import { ProviderSettingsData, ProviderSetting, Translations } from '../types';
import { EyeIcon, EyeOffIcon } from './Icons';

interface ProviderSettingsProps {
    settings: ProviderSettingsData;
    onChange: (settings: ProviderSettingsData) => void;
    disabled: boolean;
    t: Translations;
}

const PROVIDER_NAMES = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    grok: 'xAI Grok',
};

const ProviderCard: React.FC<{
    id: keyof ProviderSettingsData;
    setting: ProviderSetting;
    onChange: (id: keyof ProviderSettingsData, newSetting: ProviderSetting) => void;
    disabled: boolean;
    t: Translations;
}> = ({ id, setting, onChange, disabled, t }) => {
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        if (setting.remember) {
            const storedKey = localStorage.getItem(`${id}_apiKey`);
            if (storedKey && storedKey !== setting.apiKey) {
                onChange(id, { ...setting, apiKey: storedKey });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, setting.remember]);

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newKey = e.target.value;
        onChange(id, { ...setting, apiKey: newKey });
        if (setting.remember) {
            localStorage.setItem(`${id}_apiKey`, newKey);
        }
    };
    
    const handleRememberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const remember = e.target.checked;
        onChange(id, { ...setting, remember });
        if (remember) {
            localStorage.setItem(`${id}_apiKey`, setting.apiKey);
        } else {
            localStorage.removeItem(`${id}_apiKey`);
        }
    };

    const handleModelChange = (newModels: string[]) => {
        onChange(id, { ...setting, models: newModels });
    };

    const handleRemoveModel = (modelToRemove: string) => {
        handleModelChange(setting.models.filter(m => m !== modelToRemove));
    };

    const handleAddModel = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newModel = e.currentTarget.value.trim();
            if (newModel && !setting.models.includes(newModel)) {
                handleModelChange([...setting.models, newModel]);
            }
            e.currentTarget.value = '';
        }
    };

    return (
        <div className={`p-4 rounded-lg transition-all border ${setting.enabled ? 'bg-bunker-100 dark:bg-bunker-800/50 border-bunker-200 dark:border-bunker-700' : 'bg-bunker-100/50 dark:bg-bunker-800/20 border-transparent'}`}>
            <div className="flex items-center justify-between">
                <label htmlFor={`${id}-enabled`} className="font-bold text-lg text-bunker-800 dark:text-bunker-100 select-none">{PROVIDER_NAMES[id]}</label>
                <input
                    type="checkbox"
                    id={`${id}-enabled`}
                    checked={setting.enabled}
                    onChange={(e) => onChange(id, { ...setting, enabled: e.target.checked })}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-bunker-300 text-sky-600 focus:ring-sky-500"
                />
            </div>
            {setting.enabled && (
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-bunker-700 dark:text-bunker-300">{t.settings.apiKey}</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={setting.apiKey}
                                onChange={handleKeyChange}
                                disabled={disabled}
                                placeholder={t.settings.apiKey}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-bunker-300 dark:border-bunker-600 bg-white dark:bg-bunker-700/80 dark:text-bunker-200 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                            />
                             <button type="button" onClick={() => setShowKey(!showKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-bunker-400 hover:text-bunker-600 dark:hover:text-bunker-200">
                                {showKey ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                         <div className="flex items-center mt-2">
                            <input type="checkbox" id={`${id}-remember`} checked={setting.remember} onChange={handleRememberChange} disabled={disabled} className="h-4 w-4 rounded border-bunker-300 text-sky-600 focus:ring-sky-500" />
                            <label htmlFor={`${id}-remember`} className="ml-2 block text-sm text-bunker-600 dark:text-bunker-400">{t.settings.remember}</label>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-bunker-700 dark:text-bunker-300">{t.settings.models}</label>
                        <div className="mt-1 flex flex-wrap gap-2 p-2 border border-bunker-200 dark:border-bunker-700/80 rounded-md min-h-[40px] bg-bunker-50 dark:bg-bunker-700/50">
                            {setting.models.map(model => (
                                <span key={model} className="flex items-center gap-1.5 px-2 py-1 bg-sky-100 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200 text-xs font-medium rounded-full">
                                    {model}
                                    <button
                                        onClick={() => handleRemoveModel(model)}
                                        disabled={disabled}
                                        className="text-sky-600 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-100 disabled:opacity-50"
                                        aria-label={`Remove ${model}`}
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            onKeyDown={handleAddModel}
                            disabled={disabled}
                            placeholder={t.settings.addModel}
                            className="mt-2 block w-full pl-3 pr-4 py-2 text-base border-bunker-300 dark:border-bunker-600 bg-white dark:bg-bunker-700/80 dark:text-bunker-200 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({ settings, onChange, disabled, t }) => {
    
    const handleProviderChange = (id: keyof ProviderSettingsData, newSetting: ProviderSetting) => {
        onChange({ ...settings, [id]: newSetting });
    };

    return (
        <div className="p-6 bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg backdrop-blur-sm border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.settings.title}</h2>
            <div className="space-y-4">
               {Object.entries(settings).map(([id, setting]) => (
                   <ProviderCard key={id} id={id as keyof ProviderSettingsData} setting={setting} onChange={handleProviderChange} disabled={disabled} t={t} />
               ))}
            </div>
        </div>
    );
};
