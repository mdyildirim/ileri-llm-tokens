
import React from 'react';
import { ResultRow, Translations } from '../types';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';

interface AnalysisSummaryProps {
    results: ResultRow[];
    t: Translations;
}

interface AnalysisData {
    provider: string;
    model: string;
    metrics: {
        en: { tokens: number; time: number; cost: number; count: number };
        tr: { tokens: number; time: number; cost: number; count: number };
        tr_nodia: { tokens: number; time: number; cost: number; count: number };
    };
}

const getPerfChange = (base: number, current: number): number | null => {
    if (base === 0 || current === 0 || !isFinite(base) || !isFinite(current)) return null;
    return ((current / base) - 1) * 100;
};

const PerfMetric: React.FC<{ value: number | null }> = ({ value }) => {
    if (value === null) {
        return <span className="text-sm font-medium text-bunker-400">N/A</span>;
    }
    const isPositive = value > 0;
    const color = isPositive ? 'text-red-500' : 'text-green-500';
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;
    return (
        <span className={`flex items-center text-sm font-semibold ${color}`}>
            <Icon />
            {value.toFixed(1)}%
        </span>
    );
};

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ results, t }) => {
    const validResults = results.filter(r => !r.error);

    const groupedData = validResults.reduce((acc, row) => {
        const key = `${row.provider}|${row.model}`;
        if (!acc[key]) {
            acc[key] = {
                provider: row.provider,
                model: row.model,
                metrics: {
                    en: { tokens: 0, time: 0, cost: 0, count: 0 },
                    tr: { tokens: 0, time: 0, cost: 0, count: 0 },
                    tr_nodia: { tokens: 0, time: 0, cost: 0, count: 0 },
                }
            };
        }
        const group = acc[key].metrics[row.variant];
        group.tokens += row.prompt_tokens;
        group.time += row.responseTime;
        group.cost += row.cost;
        group.count++;
        return acc;
    }, {} as Record<string, AnalysisData>);

    const analysis = Object.values(groupedData).map((data: AnalysisData) => {
        const avg = (variant: 'en' | 'tr' | 'tr_nodia') => ({
            tokens: data.metrics[variant].tokens / data.metrics[variant].count,
            time: data.metrics[variant].time / data.metrics[variant].count,
            cost: data.metrics[variant].cost / data.metrics[variant].count,
        });

        const en_avg = avg('en');
        const tr_avg = avg('tr');
        const tr_nodia_avg = avg('tr_nodia');

        return {
            provider: data.provider,
            model: data.model,
            tr_vs_en: {
                tokens: getPerfChange(en_avg.tokens, tr_avg.tokens),
                time: getPerfChange(en_avg.time, tr_avg.time),
                cost: getPerfChange(en_avg.cost, tr_avg.cost),
            },
            tr_nodia_vs_en: {
                tokens: getPerfChange(en_avg.tokens, tr_nodia_avg.tokens),
                time: getPerfChange(en_avg.time, tr_nodia_avg.time),
                cost: getPerfChange(en_avg.cost, tr_nodia_avg.cost),
            },
            tr_nodia_vs_tr: {
                tokens: getPerfChange(tr_avg.tokens, tr_nodia_avg.tokens),
                time: getPerfChange(tr_avg.time, tr_nodia_avg.time),
                cost: getPerfChange(tr_avg.cost, tr_nodia_avg.cost),
            },
        };
    });

    if (analysis.length === 0) return null;

    return (
        <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.analysis.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.map(({ provider, model, ...comparisons }) => (
                    <div key={`${provider}-${model}`} className="bg-bunker-50 dark:bg-bunker-800/50 p-4 rounded-lg border border-bunker-200 dark:border-bunker-700">
                        <h4 className="font-bold text-bunker-900 dark:text-bunker-100">{provider}</h4>
                        <p className="text-sm text-bunker-500 dark:text-bunker-400 mb-3">{model}</p>
                        
                        <div className="space-y-3">
                            {Object.entries(comparisons).map(([compKey, metrics]) => (
                                <div key={compKey}>
                                    <h5 className="text-xs font-semibold uppercase text-bunker-500 dark:text-bunker-400 tracking-wider">
                                        {compKey.replace('_vs_', ' vs ').replace('_', '-')}
                                    </h5>
                                    <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                                        <div>
                                            <div className="text-xs text-bunker-500 dark:text-bunker-400">{t.analysis.tokens}</div>
                                            <PerfMetric value={metrics.tokens} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-bunker-500 dark:text-bunker-400">{t.analysis.time}</div>
                                            <PerfMetric value={metrics.time} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-bunker-500 dark:text-bunker-400">{t.analysis.cost}</div>
                                            <PerfMetric value={metrics.cost} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
