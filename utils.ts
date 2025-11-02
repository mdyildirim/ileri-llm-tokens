
import { DatasetRow, ResultRow } from './types';

// Normalization functions
export function toNFC(s: string): string {
    return s ? s.normalize("NFC") : s;
}

export function stripDiacriticsTr(s: string): string {
    if (!s) return s;
    return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

// Data Parsing
export function parseCsv(content: string): Record<string, string>[] {
    const lines = content.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
        // Basic CSV parsing, may not handle all edge cases like quoted newlines
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const row: Record<string, string> = {};
        header.forEach((key, i) => {
            row[key] = (values[i] || '').replace(/^"|"$/g, '').trim();
        });
        return row;
    });
    return data;
}

export function parseJsonl(content: string): Record<string, string>[] {
    return content.trim().split('\n').map(line => JSON.parse(line));
}

// Async Pool for concurrency control
export async function asyncPool<T, R>(
    concurrency: number,
    iterable: T[],
    iteratorFn: (item: T) => Promise<R>,
    delayMs: number = 0,
    cancelRef?: React.MutableRefObject<boolean>
): Promise<(R | undefined)[]> {
    const results: (R|undefined)[] = [];
    const executing = new Set<Promise<void>>();

    for (const item of iterable) {
        if (cancelRef?.current) {
            break;
        }
        
        while (executing.size >= concurrency) {
            await Promise.race(executing);
             if (cancelRef?.current) {
                break;
            }
        }
        
        if (cancelRef?.current) {
            break;
        }

        const promise = (async () => {
            const result = await iteratorFn(item);
            if (delayMs > 0 && !cancelRef?.current) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            results.push(result);
        })();

        const executingPromise = promise.then(() => executing.delete(executingPromise));
        executing.add(executingPromise);
    }
    
    await Promise.all(executing);
    return results.filter(r => r !== undefined);
}

// Data Export
export function exportToCsv(results: ResultRow[]) {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    downloadFile(csvContent, 'results.csv', 'text/csv');
}

export function exportToJsonl(results: ResultRow[]) {
    if (results.length === 0) return;
    const jsonlContent = results.map(row => JSON.stringify(row)).join('\n');
    downloadFile(jsonlContent, 'results.jsonl', 'application/jsonl');
}

function downloadFile(content: string, fileName: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}