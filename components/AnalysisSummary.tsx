
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

interface ModelStats {
    model: string;
    provider: string;
    avgCostEn: number;
    avgCostTr: number;
    avgTimeEn: number;
    avgTimeTr: number;
    avgTokensEn: number;
    avgTokensTr: number;
    costChange: number | null;
    timeChange: number | null;
    tokenChange: number | null;
}

const getPerfChange = (base: number, current: number): number | null => {
    if (base === 0 && current === 0) return 0;
    if (base === 0 || !Number.isFinite(base) || !Number.isFinite(current)) return null;
    return ((current / base) - 1) * 100;
};

const formatChange = (value: number | null, higherTemplate: string, lowerTemplate: string, sameText: string): string => {
    if (value === null) return sameText;
    const absValue = Math.abs(value).toFixed(1);
    if (Math.abs(value) < 0.5) return sameText;
    if (value > 0) return higherTemplate.replace('{{value}}', absValue);
    return lowerTemplate.replace('{{value}}', absValue);
};

const KeyFindings: React.FC<{ modelStats: ModelStats[]; t: Translations }> = ({ modelStats, t }) => {
    if (modelStats.length === 0) return null;

    const kf = t.keyFindings;

    const sortedByCostPenalty = [...modelStats]
        .filter(m => m.costChange !== null)
        .sort((a, b) => (a.costChange || 0) - (b.costChange || 0));
    
    const sortedByTokenPenalty = [...modelStats]
        .filter(m => m.tokenChange !== null)
        .sort((a, b) => (a.tokenChange || 0) - (b.tokenChange || 0));

    const bestForTurkish = sortedByCostPenalty[0];
    const worstForTurkish = sortedByCostPenalty[sortedByCostPenalty.length - 1];

    const sortedByTurkishSpeed = [...modelStats].sort((a, b) => a.avgTimeTr - b.avgTimeTr);
    const sortedByTurkishCost = [...modelStats].sort((a, b) => a.avgCostTr - b.avgCostTr);
    const sortedByEnglishCost = [...modelStats].sort((a, b) => a.avgCostEn - b.avgCostEn);

    return (
        <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-bunker-800 dark:text-bunker-100 flex items-center gap-2">
                <span className="text-2xl">🔍</span> {kf.title}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Section 1: Per-Model Language Impact */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-5">
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                        <span>📊</span> {kf.perModelTitle}
                    </h4>
                    <div className="space-y-3">
                        {modelStats.map((m, idx) => {
                            const costText = formatChange(m.costChange, kf.costHigher, kf.costLower, kf.costSame);
                            const speedText = formatChange(m.timeChange, kf.speedSlower, kf.speedFaster, kf.speedSame);
                            const isPositiveCost = m.costChange !== null && m.costChange > 0.5;
                            const isNegativeCost = m.costChange !== null && m.costChange < -0.5;
                            const isPositiveSpeed = m.timeChange !== null && m.timeChange > 0.5;
                            const isNegativeSpeed = m.timeChange !== null && m.timeChange < -0.5;
                            
                            return (
                                <div key={idx} className="bg-white/60 dark:bg-bunker-800/60 rounded-lg p-3 border border-amber-100 dark:border-amber-900">
                                    <div className="font-semibold text-bunker-900 dark:text-bunker-100 text-sm mb-1.5">{m.model}</div>
                                    <div className="text-xs text-bunker-600 dark:text-bunker-300 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-medium ${isPositiveCost ? 'text-red-600 dark:text-red-400' : isNegativeCost ? 'text-green-600 dark:text-green-400' : 'text-bunker-500'}`}>
                                                💰 {costText}
                                            </span>
                                            <span className="text-bunker-400">{kf.vsEnglish}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-medium ${isPositiveSpeed ? 'text-red-600 dark:text-red-400' : isNegativeSpeed ? 'text-green-600 dark:text-green-400' : 'text-bunker-500'}`}>
                                                ⚡ {speedText}
                                            </span>
                                            <span className="text-bunker-400">{kf.vsEnglish}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Cross-Model Comparison */}
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl border border-sky-200 dark:border-sky-800 p-5">
                    <h4 className="font-bold text-sky-800 dark:text-sky-300 mb-4 flex items-center gap-2">
                        <span>⚔️</span> {kf.crossModelTitle}
                    </h4>
                    <div className="space-y-4">
                        {/* Turkish Speed Rankings */}
                        <div className="bg-white/60 dark:bg-bunker-800/60 rounded-lg p-3 border border-sky-100 dark:border-sky-900">
                            <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400 mb-2">🏎️ Speed {kf.inTurkish}</div>
                            <div className="space-y-1.5">
                                {sortedByTurkishSpeed.slice(0, 3).map((m, idx) => {
                                    const rank = idx + 1;
                                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                    const comparison = idx > 0 ? (() => {
                                        const fastest = sortedByTurkishSpeed[0];
                                        const diff = ((m.avgTimeTr - fastest.avgTimeTr) / fastest.avgTimeTr) * 100;
                                        return diff > 0 ? `+${diff.toFixed(1)}%` : null;
                                    })() : null;
                                    
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-bunker-700 dark:text-bunker-200">
                                                {medal} {m.model}
                                            </span>
                                            <span className="text-bunker-500 dark:text-bunker-400">
                                                {m.avgTimeTr.toFixed(0)}ms {comparison && <span className="text-red-500">({comparison})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Turkish Cost Rankings */}
                        <div className="bg-white/60 dark:bg-bunker-800/60 rounded-lg p-3 border border-sky-100 dark:border-sky-900">
                            <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400 mb-2">💵 Cost {kf.inTurkish}</div>
                            <div className="space-y-1.5">
                                {sortedByTurkishCost.slice(0, 3).map((m, idx) => {
                                    const rank = idx + 1;
                                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                    const comparison = idx > 0 ? (() => {
                                        const cheapest = sortedByTurkishCost[0];
                                        const diff = ((m.avgCostTr - cheapest.avgCostTr) / cheapest.avgCostTr) * 100;
                                        return diff > 0 ? `+${diff.toFixed(1)}%` : null;
                                    })() : null;
                                    
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-bunker-700 dark:text-bunker-200">
                                                {medal} {m.model}
                                            </span>
                                            <span className="text-bunker-500 dark:text-bunker-400">
                                                ${(m.avgCostTr * 1000).toFixed(4)}/1k {comparison && <span className="text-red-500">({comparison})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* English Cost Rankings */}
                        <div className="bg-white/60 dark:bg-bunker-800/60 rounded-lg p-3 border border-sky-100 dark:border-sky-900">
                            <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400 mb-2">💵 Cost {kf.inEnglish}</div>
                            <div className="space-y-1.5">
                                {sortedByEnglishCost.slice(0, 3).map((m, idx) => {
                                    const rank = idx + 1;
                                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                                    const comparison = idx > 0 ? (() => {
                                        const cheapest = sortedByEnglishCost[0];
                                        const diff = ((m.avgCostEn - cheapest.avgCostEn) / cheapest.avgCostEn) * 100;
                                        return diff > 0 ? `+${diff.toFixed(1)}%` : null;
                                    })() : null;
                                    
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-bunker-700 dark:text-bunker-200">
                                                {medal} {m.model}
                                            </span>
                                            <span className="text-bunker-500 dark:text-bunker-400">
                                                ${(m.avgCostEn * 1000).toFixed(4)}/1k {comparison && <span className="text-red-500">({comparison})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Turkish Language Champions */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
                        <span>🏆</span> {kf.championsTitle}
                    </h4>
                    <div className="space-y-4">
                        {/* Best for Turkish */}
                        {bestForTurkish && (
                            <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">🥇</span>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-green-700 dark:text-green-400">{kf.bestForTurkish}</div>
                                        <div className="font-bold text-green-900 dark:text-green-200">{bestForTurkish.model}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-300 mt-2 space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{kf.lowestPenalty}</span>
                                    </div>
                                    <div className="font-semibold text-green-800 dark:text-green-200">
                                        {kf.tokenPenalty.replace('{{value}}', (bestForTurkish.tokenChange || 0).toFixed(1))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Worst for Turkish */}
                        {worstForTurkish && worstForTurkish !== bestForTurkish && (
                            <div className="bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 rounded-lg p-4 border-2 border-red-300 dark:border-red-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <div className="text-xs font-bold uppercase text-red-700 dark:text-red-400">{kf.worstForTurkish}</div>
                                        <div className="font-bold text-red-900 dark:text-red-200">{worstForTurkish.model}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-red-700 dark:text-red-300 mt-2 space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span>✗</span>
                                        <span>{kf.highestPenalty}</span>
                                    </div>
                                    <div className="font-semibold text-red-800 dark:text-red-200">
                                        {kf.tokenPenalty.replace('{{value}}', (worstForTurkish.tokenChange || 0).toFixed(1))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Token Penalty Ranking */}
                        {sortedByTokenPenalty.length > 2 && (
                            <div className="bg-white/60 dark:bg-bunker-800/60 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900">
                                <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-2">📈 Token Penalty Ranking</div>
                                <div className="space-y-1.5">
                                    {sortedByTokenPenalty.map((m, idx) => {
                                        const penalty = m.tokenChange || 0;
                                        const isGood = penalty < 5;
                                        const isBad = penalty > 15;
                                        
                                        return (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-bunker-700 dark:text-bunker-200">
                                                    #{idx + 1} {m.model}
                                                </span>
                                                <span className={`font-bold ${isGood ? 'text-green-600 dark:text-green-400' : isBad ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    +{penalty.toFixed(1)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
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

    // Compute modelStats for KeyFindings
    const modelStats: ModelStats[] = Object.values(groupedData).map((data: AnalysisData) => {
        const avgCostEn = data.metrics.en.count ? data.metrics.en.cost / data.metrics.en.count : 0;
        const avgCostTr = data.metrics.tr.count ? data.metrics.tr.cost / data.metrics.tr.count : 0;
        const avgTimeEn = data.metrics.en.count ? data.metrics.en.time / data.metrics.en.count : 0;
        const avgTimeTr = data.metrics.tr.count ? data.metrics.tr.time / data.metrics.tr.count : 0;
        const avgTokensEn = data.metrics.en.count ? (data.metrics.en.inputTokens + data.metrics.en.outputTokens) / data.metrics.en.count : 0;
        const avgTokensTr = data.metrics.tr.count ? (data.metrics.tr.inputTokens + data.metrics.tr.outputTokens) / data.metrics.tr.count : 0;

        return {
            model: data.model,
            provider: data.provider,
            avgCostEn,
            avgCostTr,
            avgTimeEn,
            avgTimeTr,
            avgTokensEn,
            avgTokensTr,
            costChange: getPerfChange(avgCostEn, avgCostTr),
            timeChange: getPerfChange(avgTimeEn, avgTimeTr),
            tokenChange: getPerfChange(avgTokensEn, avgTokensTr),
        };
    });

    return (
        <div className="space-y-8">
            {/* Key Findings Section */}
            <KeyFindings modelStats={modelStats} t={t} />

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
