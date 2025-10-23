import React, { useState } from 'react';
import { ChevronDownIcon } from '../Icons';

interface AccordionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border rounded-lg overflow-hidden dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                aria-expanded={isOpen}
            >
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700">
                    {children}
                </div>
            )}
        </div>
    );
};

export default Accordion;
