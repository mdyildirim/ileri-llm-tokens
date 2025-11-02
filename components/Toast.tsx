
import React, { useState, useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircleIcon, ExclamationIcon, InfoIcon, XCircleIcon } from './Icons';

interface ToastProps {
    toast: ToastMessage;
    onClose: () => void;
}

const ICONS = {
    success: <CheckCircleIcon />,
    error: <XCircleIcon />,
    warning: <ExclamationIcon />,
    info: <InfoIcon />,
};

const COLORS = {
    success: 'bg-green-500 dark:bg-green-600',
    error: 'bg-red-500 dark:bg-red-600',
    warning: 'bg-yellow-500 dark:bg-yellow-600',
    info: 'bg-sky-500 dark:bg-sky-600',
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [onClose]);

    return (
        <div className={`flex items-start w-full max-w-sm p-4 text-white rounded-lg shadow-lg mb-4 ${COLORS[toast.type]}`}>
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
                {ICONS[toast.type]}
            </div>
            <div className="ml-3 text-sm font-normal">
                <div className="text-sm font-semibold">{toast.title}</div>
                <div>{toast.message}</div>
            </div>
            <button onClick={onClose} type="button" className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-white/20 focus:ring-2 focus:ring-white/30" aria-label="Close">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        </div>
    );
};

export type { ToastMessage };
