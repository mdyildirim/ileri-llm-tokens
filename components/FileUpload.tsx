
import React, { useCallback, useState } from 'react';
import { parseCsv, parseJsonl } from '../utils';
import { Translations } from '../types';

interface FileUploadProps {
    onFileLoaded: (data: Record<string, string>[], headers: string[]) => void;
    t: Translations;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, t }) => {
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
                let data: Record<string, string>[] = [];
                if (file.name.endsWith('.csv')) {
                    data = parseCsv(content);
                } else if (file.name.endsWith('.jsonl')) {
                    data = parseJsonl(content);
                } else {
                    throw new Error(t.upload.errorType);
                }
                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    onFileLoaded(data, headers);
                } else {
                    throw new Error(t.upload.errorEmpty);
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        reader.readAsText(file);
    };

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file) {
             handleFileChange({ target: { files: [file] } } as any);
        }
    }, [handleFileChange, t]);

    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };


    return (
        <div className="p-6 sm:p-8 bg-white dark:bg-bunker-900/70 rounded-2xl shadow-lg text-center backdrop-blur-sm border border-white/20">
            <h2 className="text-2xl font-bold mb-2 text-bunker-800 dark:text-bunker-100">{t.upload.title}</h2>
            <p className="text-bunker-600 dark:text-bunker-300 mb-6">{t.upload.desc}</p>
            <div 
                onDrop={onDrop}
                onDragOver={onDragOver}
                className="relative border-2 border-dashed border-bunker-300 dark:border-bunker-700 rounded-lg p-10 group cursor-pointer hover:border-sky-500/50 dark:hover:border-sky-400/50 transition-colors duration-300"
            >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-600 to-cyan-400 rounded-lg blur opacity-0 group-hover:opacity-50 transition duration-1000"></div>
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv,.jsonl"
                    onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="relative flex flex-col items-center justify-center space-y-2 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-bunker-400 dark:text-bunker-500 group-hover:text-sky-500 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">{t.upload.choose}</span>
                    <span className="text-bunker-500 dark:text-bunker-400">{t.upload.drag}</span>
                </label>
            </div>
            {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
    );
};
