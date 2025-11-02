
import React, { useState, useEffect } from 'react';

interface ColumnMapperProps {
    headers: string[];
    onMap: (mapping: Record<string, string>) => void;
    onCancel: () => void;
}

const REQUIRED_FIELDS = ['id', 'en', 'tr'];
const OPTIONAL_FIELDS = ['tr_nodia', 'type'];

const autoDetectMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase());

    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
        const exactMatch = headers.find(h => h === field);
        if (exactMatch) {
            mapping[field] = exactMatch;
            return;
        }
        const lowerMatch = headers.find(h => h.toLowerCase() === field);
        if (lowerMatch) {
            mapping[field] = lowerMatch;
            return;
        }
    });
    return mapping;
};

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ headers, onMap, onCancel }) => {
    const [mapping, setMapping] = useState<Record<string, string>>(autoDetectMapping(headers));
    
    const handleMappingChange = (field: string, value: string) => {
        setMapping(prev => ({ ...prev, [field]: value }));
    };

    const isMappingValid = () => {
        return REQUIRED_FIELDS.every(field => mapping[field]);
    };

    return (
        <div className="fixed inset-0 bg-bunker-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-bunker-900 rounded-2xl shadow-xl p-8 max-w-lg w-full border border-bunker-200 dark:border-bunker-700">
                <h2 className="text-2xl font-bold mb-6 text-bunker-800 dark:text-bunker-100">Map Dataset Columns</h2>
                <div className="space-y-4">
                    {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => (
                        <div key={field}>
                            <label htmlFor={field} className="block text-sm font-medium text-bunker-700 dark:text-bunker-300">
                                {field}{REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-1">*</span>}
                                {OPTIONAL_FIELDS.includes(field) && <span className="text-bunker-400"> (optional)</span>}
                            </label>
                            <select
                                id={field}
                                value={mapping[field] || ''}
                                onChange={e => handleMappingChange(field, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-bunker-300 dark:border-bunker-700 bg-white dark:bg-bunker-800 dark:text-bunker-200 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                            >
                                <option value="">Select a column</option>
                                {headers.map(header => (
                                    <option key={header} value={header}>{header}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md font-semibold text-bunker-700 dark:text-bunker-200 bg-bunker-200 dark:bg-bunker-700 hover:bg-bunker-300 dark:hover:bg-bunker-600 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => onMap(mapping)}
                        disabled={!isMappingValid()}
                        className="px-4 py-2 rounded-md font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-bunker-400 disabled:cursor-not-allowed transition-colors"
                    >
                        Confirm Mapping
                    </button>
                </div>
            </div>
        </div>
    );
};