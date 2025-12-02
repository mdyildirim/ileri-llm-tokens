
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { ResultRow, Translations } from '../types';

interface ChartsDisplayProps {
    results: ResultRow[];
    isDarkMode: boolean;
    t: Translations;
}

const CHART_COLORS = [
    { bg: 'rgba(56, 189, 248, 0.6)', border: 'rgba(56, 189, 248, 1)' }, // sky-400
    { bg: 'rgba(251, 146, 60, 0.6)', border: 'rgba(251, 146, 60, 1)' }, // orange-400
    { bg: 'rgba(74, 222, 128, 0.6)', border: 'rgba(74, 222, 128, 1)' }, // green-400
    { bg: 'rgba(192, 132, 252, 0.6)', border: 'rgba(192, 132, 252, 1)' }, // purple-400
    { bg: 'rgba(244, 63, 94, 0.6)', border: 'rgba(244, 63, 94, 1)' },   // rose-500
];

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
    const validResults = useMemo(() => results.filter(r => !r.error), [results]);

    if (validResults.length === 0) {
        return (
            <div className="mt-8 text-center text-bunker-500 dark:text-bunker-400">
                <p>{t.charts.noData}</p>
            </div>
        );
    }
    
    const providers = useMemo(() => [...new Set(validResults.map(r => r.provider))], [validResults]);
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
                    labels: { color: textColor }
                },
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

    // Chart 1: Mean prompt tokens by variant
    const meanTokensConfig = useMemo(() => {
        const data = {
            labels: variants,
            datasets: providers.map((provider, index) => {
                const data = variants.map(variant => {
                    const filtered = validResults.filter(r => r.provider === provider && r.variant === variant);
                    if (filtered.length === 0) return 0;
                    const sum = filtered.reduce((acc, r) => acc + r.prompt_tokens, 0);
                    return sum / filtered.length;
                });
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return {
                    label: provider,
                    data,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 1
                };
            })
        };
        return { type: 'bar', data, options: getChartOptions() };
    }, [providers, variants, validResults, getChartOptions]);


    // Chart 2: Mean ratio TR/EN and TR-nodia/TR
    const ratioConfig = useMemo(() => {
        const data = {
            labels: ['TR / EN Ratio', 'TR-nodia / TR Ratio'],
            datasets: providers.map((provider, index) => {
                const providerResults = validResults.filter(r => r.provider === provider);
                const resultsByRow = providerResults.reduce((acc, r) => {
                    acc[r.id] = acc[r.id] || {};
                    acc[r.id][r.variant] = r.prompt_tokens;
                    return acc;
                }, {} as Record<string, Partial<Record<ResultRow['variant'], number>>>);

                const tr_en_ratios = Object.values(resultsByRow)
                    .map((row: any) => (row.tr && row.en) ? row.tr / row.en : null)
                    .filter((v): v is number => v !== null && isFinite(v));

                const tr_nodia_tr_ratios = Object.values(resultsByRow)
                    .map((row: any) => (row.tr_nodia && row.tr) ? row.tr_nodia / row.tr : null)
                    .filter((v): v is number => v !== null && isFinite(v));

                const avg_tr_en = tr_en_ratios.length > 0 ? tr_en_ratios.reduce((a, b) => a + b, 0) / tr_en_ratios.length : 0;
                const avg_tr_nodia_tr = tr_nodia_tr_ratios.length > 0 ? tr_nodia_tr_ratios.reduce((a, b) => a + b, 0) / tr_nodia_tr_ratios.length : 0;
                
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return {
                    label: provider,
                    data: [avg_tr_en, avg_tr_nodia_tr],
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 1
                };
            })
        };
        return { type: 'bar', data, options: getChartOptions() };
    }, [providers, validResults, getChartOptions]);
    
    // Chart 3: Average Response Time by variant
    const avgResponseTimeConfig = useMemo(() => {
        const data = {
            labels: providers,
            datasets: variants.map((variant, index) => {
                const data = providers.map(provider => {
                    const filtered = validResults.filter(r => r.provider === provider && r.variant === variant && r.mode === 'real');
                    if (filtered.length === 0) return 0;
                    const sum = filtered.reduce((acc, r) => acc + r.responseTime, 0);
                    return sum / filtered.length;
                });
                const color = CHART_COLORS[index % CHART_COLORS.length];
                 return {
                    label: `${variant.toUpperCase()} (ms)`,
                    data,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 1
                };
            }),
        };
        return { type: 'bar', data, options: getChartOptions() };
    }, [providers, variants, validResults, getChartOptions]);


    return (
        <div className="mt-8 space-y-8">
            <h3 className="text-xl font-bold text-bunker-800 dark:text-bunker-100">{t.charts.title}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.meanTokens}</h3>
                    <div className="relative grow">
                        <ChartComponent chartId="meanTokensChart" config={meanTokensConfig} />
                    </div>
                </div>
                <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.meanRatios}</h3>
                     <div className="relative grow">
                        <ChartComponent chartId="ratioChart" config={ratioConfig} />
                    </div>
                </div>
            </div>
            <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.avgTime}</h3>
                <div className="relative grow">
                    <ChartComponent chartId="responseTimeChart" config={avgResponseTimeConfig} />
                </div>
            </div>
        </div>
    );
};
