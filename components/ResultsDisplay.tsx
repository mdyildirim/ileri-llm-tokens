
import React from 'react';
import { ResultRow, Translations } from '../types';
import { exportToCsv, exportToJsonl } from '../utils';
import { DownloadIcon } from './Icons';

interface ResultsDisplayProps {
    results: ResultRow[];
    t: Translations;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, t }) => {
    if (results.length === 0) {
        return <p className="text-center text-bunker-500 dark:text-bunker-400 py-4">{t.results.waiting}</p>;
    }

    const totalCost = results.reduce((acc, row) => acc + row.cost, 0);

    return (
        <div>
             <h3 className="text-xl font-bold mb-4 text-bunker-800 dark:text-bunker-100">{t.results.raw}</h3>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="p-3 bg-sky-100 dark:bg-sky-500/10 rounded-lg text-sm">
                    <p className="text-sky-800 dark:text-sky-200">
                        <strong>{t.results.totalCost}</strong>
                        <span className="font-mono ml-2 font-bold">${totalCost.toFixed(6)}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportToCsv(results)} className="px-3 py-1.5 text-sm rounded-md font-semibold text-sky-700 dark:text-sky-200 bg-sky-100 dark:bg-sky-500/20 hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors flex items-center gap-2">
                        <DownloadIcon /> {t.results.exportCsv}
                    </button>
                    <button onClick={() => exportToJsonl(results)} className="px-3 py-1.5 text-sm rounded-md font-semibold text-sky-700 dark:text-sky-200 bg-sky-100 dark:bg-sky-500/20 hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors flex items-center gap-2">
                        <DownloadIcon /> {t.results.exportJsonl}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] rounded-lg border border-bunker-200 dark:border-bunker-700">
                <table className="min-w-full divide-y divide-bunker-200 dark:divide-bunker-700">
                    <thead className="bg-bunker-100 dark:bg-bunker-800 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.id}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.provider}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.model}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.variant}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.prompt}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.completion}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.total}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.output}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.mode}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.cost}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-bunker-500 dark:text-bunker-300 uppercase tracking-wider">{t.results.table.time}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-bunker-900 divide-y divide-bunker-200 dark:divide-bunker-700">
                        {results.map((row, index) => (
                            <tr key={index} className={`transition-colors duration-200 ${row.error ? 'bg-red-50 dark:bg-red-500/10' : 'even:bg-bunker-50 dark:even:bg-bunker-800/50'} hover:bg-sky-50 dark:hover:bg-sky-500/10`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-bunker-900 dark:text-bunker-100">{row.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">{row.provider}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">
                                    <div className="font-medium">{row.model}</div>
                                    {row.customParams && (
                                        <div className="text-[10px] text-bunker-400 dark:text-bunker-500 mt-0.5 font-mono">{row.customParams}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">{row.variant}</td>
                                {row.error ? (
                                    <td colSpan={7} className="px-6 py-4 whitespace-normal text-sm text-red-700 dark:text-red-300">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{t.results.table.error}</span>
                                            <span>{row.error}</span>
                                        </div>
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">{row.prompt_tokens}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">{row.completion_tokens}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-bunker-700 dark:text-bunker-200">{row.total_tokens}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300 max-w-[300px] truncate" title={row.output_text}>
                                            {row.output_text ? row.output_text : (row.completion_tokens > 0 ? <span className="text-bunker-400 italic">&lt;empty&gt;</span> : '')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.mode === 'real' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                                                {row.mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-bunker-500 dark:text-bunker-300">${row.cost.toFixed(6)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bunker-500 dark:text-bunker-300">{row.responseTime} ms</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
