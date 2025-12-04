
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

    // Group keys by model (Provider + Model Name) to make the chart readable
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
                    labels: { color: textColor }
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

    // Chart 1: Estimated Cost by Model (Comparison)
    const costConfig = useMemo(() => {
        if (validResults.length === 0) return {};
        const data = {
            labels: models,
            datasets: variants.map((variant, index) => {
                const data = models.map(modelKey => {
                    const filtered = validResults.filter(r => `${r.provider} ${r.model}` === modelKey && r.variant === variant);
                    if (filtered.length === 0) return 0;
                    // Sum total cost for this model/variant in the current run
                    return filtered.reduce((acc, r) => acc + r.cost, 0);
                });
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return {
                    label: variant.toUpperCase(),
                    data,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 1
                };
            })
        };
        const options: any = getChartOptions('y'); // Horizontal bars for easier reading of model names
        options.scales.x.title = {
             display: true,
             text: 'Total Cost ($)',
             color: isDarkMode ? '#e2e8f0' : '#334155'
        };
        // Fix for scientific notation on small values
        options.scales.x.ticks = {
            ...options.scales.x.ticks,
            callback: (value: number) => {
                return '$' + value.toFixed(6).replace(/(\.0+|0+)$/, '');
            }
        };

        return { type: 'bar', data, options };
    }, [models, variants, validResults, getChartOptions, isDarkMode]);


    // Chart 2: Percentage Overhead vs English
    const overheadConfig = useMemo(() => {
        if (validResults.length === 0) return {};
        // We need providers for this one specifically to group by provider not just model
        const providers = [...new Set(validResults.map(r => r.provider))];
        const comparisonVariants: Array<{ id: 'tr' | 'tr_nodia'; label: string }> = [
            { id: 'tr', label: `${t.analysis.subjects.tr} vs ${t.analysis.subjects.en}` },
            { id: 'tr_nodia', label: `${t.analysis.subjects.tr_nodia} vs ${t.analysis.subjects.en}` }
        ];

        const data = {
            labels: models, // Use specific models on X axis now for better granularity
            datasets: comparisonVariants.map((comp, index) => {
                const data = models.map(modelKey => {
                    // Filter by specific model string
                    const modelResults = validResults.filter(r => `${r.provider} ${r.model}` === modelKey);
                    
                    // Group by ID to calculate ratio per row
                    const resultsByRow = modelResults.reduce((acc, r) => {
                        acc[r.id] = acc[r.id] || {};
                        acc[r.id][r.variant] = r.prompt_tokens;
                        return acc;
                    }, {} as Record<string, Partial<Record<ResultRow['variant'], number>>>);

                    const overheads = Object.values(resultsByRow)
                        .map((row: any) => {
                            const en = row.en;
                            const target = row[comp.id];
                            if (en && target && en > 0) {
                                return ((target / en) - 1) * 100;
                            }
                            return null;
                        })
                        .filter((v): v is number => v !== null && isFinite(v));

                    if (overheads.length === 0) return 0;
                    return overheads.reduce((a, b) => a + b, 0) / overheads.length;
                });

                // Start colors from index 3 to look different
                const color = CHART_COLORS[(index + 3) % CHART_COLORS.length];
                
                return {
                    label: comp.label + ' (%)',
                    data,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    borderWidth: 1
                };
            })
        };
        
        const options: any = getChartOptions();
        options.scales.y.title = {
            display: true,
            text: 'Overhead % (More Tokens)',
            color: isDarkMode ? '#e2e8f0' : '#334155'
        };

        return { type: 'bar', data, options };
    }, [models, validResults, getChartOptions, t, isDarkMode]);
    
    // Chart 3: Average Response Time by variant
    const avgResponseTimeConfig = useMemo(() => {
        if (validResults.length === 0) return {};
        const data = {
            labels: models,
            datasets: variants.map((variant, index) => {
                const data = models.map(modelKey => {
                    const filtered = validResults.filter(r => `${r.provider} ${r.model}` === modelKey && r.variant === variant && r.mode === 'real');
                    if (filtered.length === 0) return 0;
                    const sum = filtered.reduce((acc, r) => acc + r.responseTime, 0);
                    return Math.round(sum / filtered.length);
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
    }, [models, variants, validResults, getChartOptions]);


    if (validResults.length === 0) {
        return (
            <div className="text-center text-bunker-500 dark:text-bunker-400">
                <p>{t.charts.noData}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-bold text-bunker-800 dark:text-bunker-100">{t.charts.title}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Cost (Replaces Mean Tokens) */}
                <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.cost}</h3>
                    <div className="relative grow">
                        <ChartComponent chartId="costChart" config={costConfig} />
                    </div>
                </div>
                
                {/* Chart 2: Overhead */}
                <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.overhead}</h3>
                     <div className="relative grow">
                        <ChartComponent chartId="overheadChart" config={overheadConfig} />
                    </div>
                </div>
            </div>
            {/* Chart 3: Response Time */}
            <div className="p-4 bg-bunker-50 dark:bg-bunker-800/50 rounded-lg h-[450px] flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-bunker-800 dark:text-bunker-100 shrink-0">{t.charts.avgTime}</h3>
                <div className="relative grow">
                    <ChartComponent chartId="responseTimeChart" config={avgResponseTimeConfig} />
                </div>
            </div>
        </div>
    );
};
