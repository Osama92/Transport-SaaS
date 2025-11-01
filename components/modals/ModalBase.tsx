import React, { useEffect } from 'react';
import { XMarkIcon } from '../Icons';

interface ModalBaseProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    zIndex?: string; // Optional z-index override (e.g., 'z-60', 'z-[60]')
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Modal size
}

const ModalBase: React.FC<ModalBaseProps> = ({ title, onClose, children, zIndex = 'z-50', size = 'md' }) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-6xl'
    };
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 ${zIndex} flex justify-center items-center p-4`}
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-5 border-b dark:border-slate-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default ModalBase;