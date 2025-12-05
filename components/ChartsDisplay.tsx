
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { ResultRow, Translations } from '../types';

interface ChartsDisplayProps {
    results: ResultRow[];
    isDarkMode: boolean;
    t: Translations;
}

const CHART_COLORS = {
    en: { bg: 'rgba(56, 189, 248, 0.7)', border: 'rgba(56, 189, 248, 1)' },      // sky-400 (calm, baseline)
    tr: { bg: 'rgba(244, 63, 94, 0.7)', border: 'rgba(244, 63, 94, 1)' },        // rose-500 (alert, penalty)
    tr_nodia: { bg: 'rgba(251, 146, 60, 0.7)', border: 'rgba(251, 146, 60, 1)' }, // orange-400
    fair: { bg: 'rgba(74, 222, 128, 0.7)', border: 'rgba(74, 222, 128, 1)' },     // green-400 (fairness)
};

const ChartComponent: React.FC<{ chartId: string, config: any }> = ({ chartId, config }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            // @ts-ignore
            chartInstance.current = new Chart(chartRef.current, config);
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [config]);

    return <canvas ref={chartRef} id={chartId}></canvas>;
};

export const ChartsDisplay: React.FC<ChartsDisplayProps> = ({ results, isDarkMode, t }) => {
    const validResults = useMemo(() => results.filter(r => !r.error && r.tokens_per_char != null), [results]);

    const models = useMemo(() => [...new Set(validResults.map(r => `${r.provider} ${r.model}`))].sort(), [validResults]);
    const variants: Array<ResultRow['variant']> = useMemo(() => ['en', 'tr', 'tr_nodia'], []);

    const getChartOptions = useCallback((indexAxis: 'x' | 'y' = 'x') => {
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e2e8f0' : '#334155';
        return {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis,
            plugins: {
                legend: {
                    position: 'top' as const,
                    labels: { color: textColor, font: { weight: 'bold' } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor },
                }
            }
        }
    }, [isDarkMode]);

    // Calculate penalty stats for the insight card
    const penaltyStats = useMemo(() => {
        if (validResults.length === 0) return null;
        
        const byVariant = {
            en: validResults.filter(r => r.variant === 'en'),
            tr: validResults.filter(r => r.variant === 'tr'),
        };
        
        const avgInputTokPerChar = {
            en: byVariant.en.length > 0 ? byVariant.en.reduce((s, r) => s + (r.tokens_per_char || 0), 0) / byVariant.en.length : 0,
            tr: byVariant.tr.length > 0 ? byVariant.tr.reduce((s, r) => s + (r.tokens_per_char || 0), 0) / byVariant.tr.length : 0,
        };
        
        const avgOutputTokPerChar = {
            en: byVariant.en.length > 0 ? byVariant.en.reduce((s, r) => s + (r.output_tokens_per_char || 0), 0) / byVariant.en.length : 0,
            tr: byVariant.tr.length > 0 ? byVariant.tr.reduce((s, r) => s + (r.output_tokens_per_char || 0), 0) / byVariant.tr.length : 0,
        };
        
        const inputPenalty = avgInputTokPerChar.en > 0 ? (avgInputTokPerChar.tr / avgInputTokPerChar.en) : 1;
        const outputDiff = avgOutputTokPerChar.en > 0 ? Math.abs((avgOutputTokPerChar.tr / avgOutputTokPerChar.en) - 1) * 100 : 0;
        
        return { inputPenalty, outputDiff, avgInputTokPerChar, avgOutputTokPerChar };
    }, [validResults]);

    // Chart 1: INPUT PENALTY - Tokens per Character (Input)
    const inputPenaltyConfig = useMemo(() => {
        if (validResults.length === 0) return {};
        
        const data = {
            labels: models,
            datasets: variants.map((variant) => {
                const chartData = models.map(modelKey => {
                    const filtered = validResults.filter(r => `${r.provider} ${r.model}` === modelKey && r.variant === variant);
                    if (filtered.length === 0) return 0;
                    const sum = filtered.reduce((acc, r) => acc + (r.tokens_per_char || 0), 0);
                    return sum / filtered.length;
                });
                const color = CHART_COLORS[variant];
                return {
                    label: t.analysis.subjects[variant],
                    data: chartData,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 2
                };
            })
        };
        
        const options: any = getChartOptions('y');
        options.scales.x.title = {
            display: true,
            text: t.charts.inputAxisLabel || 'Tokens per Character (Higher = More Expensive)',
            color: isDarkMode ? '#e2e8f0' : '#334155',
            font: { weight: 'bold' }
        };
        options.scales.x.ticks = {
            ...options.scales.x.ticks,
            callback: (value: number) => value.toFixed(3)
        };
        options.plugins.tooltip = {
            callbacks: {
                label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(4)} tokens/char`
            }
        };

        return { type: 'bar', data, options };
    }, [models, variants, validResults, getChartOptions, isDarkMode, t]);

    // Chart 2: OUTPUT FAIRNESS - Tokens per Character (Output)
    const outputFairnessConfig = useMemo(() => {
        if (validResults.length === 0) return {};
        
        const data = {
            labels: models,
            datasets: variants.map((variant) => {
                const chartData = models.map(modelKey => {
                    const filtered = validResults.filter(r => `${r.provider} ${r.model}` === modelKey && r.variant === variant && (r.output_tokens_per_char || 0) > 0);
                    if (filtered.length === 0) return 0;
                    const sum = filtered.reduce((acc, r) => acc + (r.output_tokens_per_char || 0), 0);
                    return sum / filtered.length;
                });
                const color = CHART_COLORS[variant];
                return {
                    label: t.analysis.subjects[variant],
                    data: chartData,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 2
                };
            })
        };
        
        const options: any = getChartOptions('y');
        options.scales.x.title = {
            display: true,
            text: t.charts.outputAxisLabel || 'Tokens per Character (Similar = Fair)',
            color: isDarkMode ? '#e2e8f0' : '#334155',
            font: { weight: 'bold' }
        };
        options.scales.x.ticks = {
            ...options.scales.x.ticks,
            callback: (value: number) => value.toFixed(3)
        };
        options.plugins.tooltip = {
            callbacks: {
                label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(4)} tokens/char`
            }
        };

        return { type: 'bar', data, options };
    }, [models, variants, validResults, getChartOptions, isDarkMode, t]);

    if (validResults.length === 0) {
        return (
            <div className="text-center text-bunker-500 dark:text-bunker-400">
                <p>{t.charts.noData}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-bunker-800 dark:text-bunker-100">{t.charts.title}</h3>
            
            {/* Key Insight Card */}
            {penaltyStats && penaltyStats.inputPenalty > 1 && t.charts.insightText && (
                <div className="p-5 bg-gradient-to-r from-rose-50 to-sky-50 dark:from-rose-900/20 dark:to-sky-900/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                    <p className="text-lg text-bunker-800 dark:text-bunker-100 leading-relaxed">
                        <span className="font-bold text-rose-600 dark:text-rose-400">{t.charts.insightPrefix}</span>
                        {' '}
                        <span dangerouslySetInnerHTML={{ 
                            __html: t.charts.insightText
                                .replace('{{penalty}}', `<strong class="text-rose-600 dark:text-rose-400">${penaltyStats.inputPenalty.toFixed(1)}×</strong>`)
                                .replace('{{fairness}}', penaltyStats.outputDiff < 5 
                                    ? `<strong class="text-green-600 dark:text-green-400">${t.charts.insightFair || 'nearly identical'}</strong>` 
                                    : `<strong class="text-amber-600 dark:text-amber-400">${penaltyStats.outputDiff.toFixed(1)}%</strong>`)
                        }} />
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Input Penalty */}
                <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800/30 h-[450px] flex flex-col">
                    <div className="mb-3 shrink-0">
                        <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">{t.charts.inputPenalty || 'Input Penalty'}</h3>
                        <p className="text-sm text-rose-600/80 dark:text-rose-400/80">{t.charts.inputPenaltyDesc || 'How many tokens per character does it cost to ASK a question?'}</p>
                    </div>
                    <div className="relative grow">
                        <ChartComponent chartId="inputPenaltyChart" config={inputPenaltyConfig} />
                    </div>
                </div>
                
                {/* Chart 2: Output Fairness */}
                <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30 h-[450px] flex flex-col">
                    <div className="mb-3 shrink-0">
                        <h3 className="text-lg font-bold text-green-700 dark:text-green-300">{t.charts.outputFairness || 'Output Fairness'}</h3>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80">{t.charts.outputFairnessDesc || 'How many tokens per character does the AI use to RESPOND?'}</p>
                    </div>
                    <div className="relative grow">
                        <ChartComponent chartId="outputFairnessChart" config={outputFairnessConfig} />
                    </div>
                </div>
            </div>
        </div>
    );
};
