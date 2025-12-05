
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

    // Calculate insights using same methodology as AnalysisSummary
    const insights = useMemo(() => {
        if (validResults.length === 0) return null;
        
        // Group by model
        const byModel: Record<string, { en: number[], tr: number[], tr_nodia: number[] }> = {};
        validResults.forEach(r => {
            const key = `${r.provider} ${r.model}`;
            if (!byModel[key]) byModel[key] = { en: [], tr: [], tr_nodia: [] };
            byModel[key][r.variant].push(r.prompt_tokens);
        });
        
        // Calculate per-model token overhead (TR vs EN)
        const modelPenalties: { model: string; penalty: number; enAvg: number; trAvg: number }[] = [];
        Object.entries(byModel).forEach(([model, data]) => {
            if (data.en.length > 0 && data.tr.length > 0) {
                const enAvg = data.en.reduce((a, b) => a + b, 0) / data.en.length;
                const trAvg = data.tr.reduce((a, b) => a + b, 0) / data.tr.length;
                if (enAvg > 0) {
                    const penalty = ((trAvg / enAvg) - 1) * 100; // percentage overhead
                    modelPenalties.push({ model, penalty, enAvg, trAvg });
                }
            }
        });
        
        if (modelPenalties.length === 0) return null;
        
        // Overall average penalty
        const avgPenalty = modelPenalties.reduce((s, m) => s + m.penalty, 0) / modelPenalties.length;
        
        // Find best and worst for multi-model scenarios
        const sorted = [...modelPenalties].sort((a, b) => a.penalty - b.penalty);
        const bestModel = sorted[0];
        const worstModel = sorted[sorted.length - 1];
        
        // Calculate output fairness (should be similar across variants)
        const outputByVariant = { en: [] as number[], tr: [] as number[] };
        validResults.forEach(r => {
            if (r.output_tokens_per_char && r.output_tokens_per_char > 0) {
                outputByVariant[r.variant === 'tr_nodia' ? 'tr' : r.variant].push(r.output_tokens_per_char);
            }
        });
        const avgOutputEn = outputByVariant.en.length > 0 ? outputByVariant.en.reduce((a, b) => a + b, 0) / outputByVariant.en.length : 0;
        const avgOutputTr = outputByVariant.tr.length > 0 ? outputByVariant.tr.reduce((a, b) => a + b, 0) / outputByVariant.tr.length : 0;
        const outputDiff = avgOutputEn > 0 ? Math.abs((avgOutputTr / avgOutputEn) - 1) * 100 : 0;
        
        return {
            avgPenalty,
            outputDiff,
            modelCount: modelPenalties.length,
            bestModel: modelPenalties.length > 1 ? bestModel : null,
            worstModel: modelPenalties.length > 1 && worstModel.penalty !== bestModel.penalty ? worstModel : null,
        };
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
            
            {/* Key Insight Cards */}
            {insights && insights.avgPenalty > 0.5 && (
                <div className="space-y-3">
                    {/* Main Finding */}
                    <div className="p-5 bg-gradient-to-r from-rose-50 to-sky-50 dark:from-rose-900/20 dark:to-sky-900/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                        <p className="text-lg text-bunker-800 dark:text-bunker-100 leading-relaxed">
                            <span className="font-bold text-rose-600 dark:text-rose-400">{t.charts.insightPrefix || 'Key Finding:'}</span>
                            {' '}
                            <span dangerouslySetInnerHTML={{ 
                                __html: (t.charts.insightText || 'Turkish users pay up to {{penalty}} more to ask questions in their own language... but once the AI answers, the cost difference is {{fairness}}.')
                                    .replace('{{penalty}}', `<strong class="text-rose-600 dark:text-rose-400">${insights.avgPenalty.toFixed(1)}%</strong>`)
                                    .replace('{{fairness}}', insights.outputDiff < 5 
                                        ? `<strong class="text-green-600 dark:text-green-400">${t.charts.insightFair || 'nearly identical'}</strong>` 
                                        : `<strong class="text-amber-600 dark:text-amber-400">${insights.outputDiff.toFixed(1)}% different</strong>`)
                            }} />
                        </p>
                    </div>
                    
                    {/* Multi-model insights */}
                    {insights.bestModel && insights.worstModel && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
                                <p className="text-sm text-bunker-700 dark:text-bunker-200">
                                    <span className="font-bold text-green-600 dark:text-green-400">{t.charts.bestModel || 'Best for Turkish:'}</span>
                                    {' '}
                                    <span className="font-medium">{insights.bestModel.model}</span>
                                    {' '}
                                    <span className="text-green-600 dark:text-green-400">
                                        ({insights.bestModel.penalty > 0 ? '+' : ''}{insights.bestModel.penalty.toFixed(1)}% overhead)
                                    </span>
                                </p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
                                <p className="text-sm text-bunker-700 dark:text-bunker-200">
                                    <span className="font-bold text-red-600 dark:text-red-400">{t.charts.worstModel || 'Worst for Turkish:'}</span>
                                    {' '}
                                    <span className="font-medium">{insights.worstModel.model}</span>
                                    {' '}
                                    <span className="text-red-600 dark:text-red-400">
                                        (+{insights.worstModel.penalty.toFixed(1)}% overhead)
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
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
