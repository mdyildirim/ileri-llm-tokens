
import React from 'react';
import { ResultRow, Translations } from '../types';
import { PRICING_DATA } from '../services/llmProviders';
import { InfoIcon } from './Icons';

interface AnalysisSummaryProps {
    results: ResultRow[];
    t: Translations; 
}

interface MetricGroup {
    inputTokens: number;
    outputTokens: number;
    time: number;
    cost: number;
    count: number;
}

interface AnalysisData {
    provider: string;
    model: string;
    metrics: {
        en: MetricGroup;
        tr: MetricGroup;
        tr_nodia: MetricGroup;
    };
}

const getPerfChange = (base: number, current: number): number | null => {
    if (base === 0 && current === 0) return 0;
    if (base === 0 || !Number.isFinite(base) || !Number.isFinite(current)) return null;
    return ((current / base) - 1) * 100;
};

const SentenceRow: React.FC<{ 
    subject: string;
    value: number | null; 
    type: 'tokens' | 'time' | 'cost';
    t: Translations;
}> = ({ subject, value, type, t }) => {
    if (value === null) return null;
    
    // Threshold to consider "same"
    const isZero = Math.abs(value) < 0.1;

    let sentenceKey = '';
    
    // Determine the sentence key based on type and direction
    if (isZero) {
        sentenceKey = 'isSame';
    } else if (type === 'tokens') {
        sentenceKey = value > 0 ? 'usesMoreTokens' : 'usesFewerTokens';
    } else if (type === 'time') {
        sentenceKey = value > 0 ? 'isSlower' : 'isFaster';
    } else if (type === 'cost') {
        sentenceKey = value > 0 ? 'isMoreExpensive' : 'isCheaper';
    }

    // @ts-ignore
    const template = t.analysis.sentences[sentenceKey];
    const absValue = Math.abs(value).toFixed(1);
    
    // Construct sentence
    const predicate = template.replace('{{value}}', absValue);
    
    let highlightColor = 'text-bunker-600 dark:text-bunker-400';
    if (!isZero) {
        highlightColor = value > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold';
    }

    return (
        <div className="flex items-start py-1.5 text-sm text-bunker-800 dark:text-bunker-200">
             <div className="mr-1.5 mt-1.5 w-1.5 h-1.5 rounded-full bg-bunker-300 dark:bg-bunker-600 shrink-0"></div>
             <span>
                <span className="font-semibold text-bunker-900 dark:text-bunker-100">{subject}</span>
                {' '}
                <span className={highlightColor}>{predicate}</span>
             </span>
        </div>
    );
};

const getPricingForModel = (model: string) => {
    // Sort keys by length descending to match specific models first (same logic as llmProviders)
    const sortedKeys = Object.keys(PRICING_DATA).sort((a, b) => b.length - a.length);
    const priceKey = sortedKeys.find(key => model.startsWith(key));
    return priceKey ? PRICING_DATA[priceKey] : null;
};

const ModelComparisonTable: React.FC<{
    variant: 'en' | 'tr' | 'tr_nodia';
    data: AnalysisData[];
    t: Translations;
}> = ({ variant, data, t }) => {
    // Sort by Total Cost per 1k requests
    const sortedData = [...data].sort((a, b) => {
        const costA = a.metrics[variant].count ? (a.metrics[variant].cost / a.metrics[variant].count) : 0;
        const costB = b.metrics[variant].count ? (b.metrics[variant].cost / b.metrics[variant].count) : 0;
        return costA - costB;
    });

    const minCost = Math.min(...data.map(d => d.metrics[variant].count ? d.metrics[variant].cost / d.metrics[variant].count : Infinity));

    return (
        <div className="overflow-visible bg-white dark:bg-bunker-800 rounded-lg border border-bunker-200 dark:border-bunker-700 h-full flex flex-col">
            <div className="px-4 py-2 bg-bunker-100 dark:bg-bunker-900/50 border-b border-bunker-200 dark:border-bunker-700 font-bold text-center text-bunker-800 dark:text-bunker-100 uppercase text-xs tracking-wider shrink-0">
                {t.analysis.subjects[variant]}
            </div>
            <div className="overflow-x-auto grow">
                <table className="min-w-full divide-y divide-bunker-200 dark:divide-bunker-700">
                    <thead className="bg-bunker-50 dark:bg-bunker-800">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-bunker-500 dark:text-bunker-400 uppercase tracking-wider">{t.analysis.table.model}</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-bunker-500 dark:text-bunker-400 uppercase tracking-wider">
                                {t.analysis.table.avgTokens}
                                <div className="text-[10px] normal-case opacity-70">{t.analysis.table.tokenSplit}</div>
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-bunker-500 dark:text-bunker-400 uppercase tracking-wider">
                                {t.analysis.table.avgCost}
                                <div className="text-[10px] normal-case opacity-70">{t.analysis.table.costSplit}</div>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-bunker-500 dark:text-bunker-400 uppercase tracking-wider">{t.analysis.table.avgTime}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-bunker-900 divide-y divide-bunker-200 dark:divide-bunker-700">
                        {sortedData.map((row, idx) => {
                            const count = row.metrics[variant].count || 1;
                            const avgInput = row.metrics[variant].inputTokens / count;
                            const avgOutput = row.metrics[variant].outputTokens / count;
                            
                            const avgTime = row.metrics[variant].time / count;
                            const avgTotalCost = row.metrics[variant].cost / count;
                            
                            const pricing = getPricingForModel(row.model);
                            
                            // Calculate extrapolated costs for 1k requests based on average tokens
                            // We calculate this for display, ensuring input+output adds up roughly to total
                            let extrapolatedInputCost = 0;
                            let extrapolatedOutputCost = 0;
                            
                            if (pricing) {
                                extrapolatedInputCost = (avgInput / 1_000_000) * pricing.input * 1000;
                                extrapolatedOutputCost = (avgOutput / 1_000_000) * pricing.output * 1000;
                            }
                            
                            const extrapolatedTotalCost = avgTotalCost * 1000;

                            return (
                                <tr key={idx} className="hover:bg-bunker-50 dark:hover:bg-bunker-800/50 transition-colors">
                                    <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-bunker-900 dark:text-bunker-100">
                                        <div className="flex items-center gap-2 group relative">
                                            <span>{row.model}</span>
                                            {pricing && (
                                                <>
                                                    <div className="text-bunker-400 hover:text-sky-500 cursor-help transition-colors">
                                                        <InfoIcon />
                                                    </div>
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-bunker-900 text-white text-xs rounded shadow-xl z-50 pointer-events-none">
                                                        <div className="font-bold mb-1 border-b border-bunker-700 pb-1">{t.analysis.table.rates}</div>
                                                        <div className="flex justify-between">
                                                            <span>{t.analysis.table.input}:</span>
                                                            <span className="font-mono">${pricing.input.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t.analysis.table.output}:</span>
                                                            <span className="font-mono">${pricing.output.toFixed(2)}</span>
                                                        </div>
                                                        {pricing.note && (
                                                            <div className="mt-1 text-bunker-400 italic text-[10px]">{pricing.note}</div>
                                                        )}
                                                        <div className="absolute left-4 -bottom-1 w-2 h-2 bg-bunker-900 transform rotate-45"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    
                                    {/* Tokens: Input / Output */}
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-medium text-bunker-600 dark:text-bunker-300" title="Input Tokens">{avgInput.toFixed(1)}</span>
                                            <span className="text-[10px] text-bunker-400 border-t border-bunker-100 dark:border-bunker-700 pt-0.5 mt-0.5" title="Output Tokens">{avgOutput.toFixed(1)}</span>
                                        </div>
                                    </td>

                                    {/* Costs: Input / Output / Total */}
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <div className="flex flex-col text-xs">
                                            <div className="flex justify-center gap-1 text-[10px] text-bunker-400 mb-0.5">
                                                <span title="Input Cost">${extrapolatedInputCost.toFixed(4)}</span>
                                                <span>+</span>
                                                <span title="Output Cost">${extrapolatedOutputCost.toFixed(4)}</span>
                                            </div>
                                            <span className={`font-bold border-t border-bunker-200 dark:border-bunker-700 pt-0.5 ${Math.abs(avgTotalCost - minCost) < 0.0000001 ? 'text-green-600 dark:text-green-400' : 'text-bunker-700 dark:text-bunker-200'}`}>
                                                ${extrapolatedTotalCost.toFixed(4)}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-right text-bunker-500 dark:text-bunker-300">
                                        {avgTime.toFixed(0)} ms
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
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
                    en: { inputTokens: 0, outputTokens: 0, time: 0, cost: 0, count: 0 },
                    tr: { inputTokens: 0, outputTokens: 0, time: 0, cost: 0, count: 0 },
                    tr_nodia: { inputTokens: 0, outputTokens: 0, time: 0, cost: 0, count: 0 },
                }
            };
        }
        const group = acc[key].metrics[row.variant];
        
        group.inputTokens += row.prompt_tokens;
        group.outputTokens += row.completion_tokens;
        group.time += row.responseTime;
        group.cost += row.cost;
        group.count++;
        return acc;
    }, {} as Record<string, AnalysisData>);

    const analysis = Object.values(groupedData).map((data: AnalysisData) => {
        const avg = (variant: 'en' | 'tr' | 'tr_nodia') => ({
            tokens: data.metrics[variant].count ? (data.metrics[variant].inputTokens + data.metrics[variant].outputTokens) / data.metrics[variant].count : 0,
            time: data.metrics[variant].count ? data.metrics[variant].time / data.metrics[variant].count : 0,
            cost: data.metrics[variant].count ? data.metrics[variant].cost / data.metrics[variant].count : 0,
        });

        const en_avg = avg('en');
        const tr_avg = avg('tr');
        const tr_nodia_avg = avg('tr_nodia');

        return {
            provider: data.provider,
            model: data.model,
            metrics: data.metrics, // Pass original metrics for table
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

    // Sort analysis for the comparison cards to ensure consistent order
    const sortedAnalysis = [...analysis].sort((a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model));

    return (
        <div className="space-y-8">
            {/* Model Comparison Section */}
            <div>
                <h3 className="text-xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.analysis.modelCompTitle}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <ModelComparisonTable variant="en" data={Object.values(groupedData)} t={t} />
                    <ModelComparisonTable variant="tr" data={Object.values(groupedData)} t={t} />
                    <ModelComparisonTable variant="tr_nodia" data={Object.values(groupedData)} t={t} />
                </div>
            </div>

            {/* Language Analysis Cards */}
            <div>
                <h3 className="text-xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.analysis.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedAnalysis.map(({ provider, model, ...comparisons }) => (
                        <div key={`${provider}-${model}`} className="bg-white dark:bg-bunker-900 rounded-xl shadow-sm border border-bunker-200 dark:border-bunker-700 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="bg-bunker-50 dark:bg-bunker-800 px-4 py-3 border-b border-bunker-200 dark:border-bunker-700">
                                <h4 className="font-bold text-bunker-900 dark:text-bunker-100 text-lg leading-tight">{provider}</h4>
                                <p className="text-sm text-bunker-500 dark:text-bunker-400 font-mono mt-1 truncate">{model}</p>
                            </div>
                            
                            <div className="p-4 space-y-5">
                                {/* TR vs EN Block */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-bunker-400 dark:text-bunker-500 tracking-wider mb-2">
                                        {t.analysis.comp.tr_vs_en}
                                    </h5>
                                    <div className="space-y-0.5">
                                        <SentenceRow subject={t.analysis.subjects.tr} value={comparisons.tr_vs_en.tokens} type="tokens" t={t} />
                                        <SentenceRow subject={t.analysis.subjects.tr} value={comparisons.tr_vs_en.cost} type="cost" t={t} />
                                        <SentenceRow subject={t.analysis.subjects.tr} value={comparisons.tr_vs_en.time} type="time" t={t} />
                                    </div>
                                </div>

                                {/* TR_Nodia vs EN Block */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-bunker-400 dark:text-bunker-500 tracking-wider mb-2 pt-2 border-t border-bunker-100 dark:border-bunker-800/50">
                                        {t.analysis.comp.tr_nodia_vs_en}
                                    </h5>
                                    <div className="space-y-0.5">
                                        <SentenceRow subject={t.analysis.subjects.tr_nodia} value={comparisons.tr_nodia_vs_en.tokens} type="tokens" t={t} />
                                    </div>
                                </div>

                                {/* Impact of removing diacritics */}
                                <div>
                                    <h5 className="text-xs font-bold uppercase text-bunker-400 dark:text-bunker-500 tracking-wider mb-2 pt-2 border-t border-bunker-100 dark:border-bunker-800/50">
                                        {t.analysis.comp.tr_nodia_vs_tr}
                                    </h5>
                                    <div className="space-y-0.5">
                                        <SentenceRow subject={t.analysis.subjects.tr_nodia} value={comparisons.tr_nodia_vs_tr.tokens} type="tokens" t={t} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
