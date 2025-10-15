import React from 'react';
import type { InvoiceTemplateType } from './InvoiceTemplates';

interface InvoiceTemplatePickerProps {
    selected: InvoiceTemplateType;
    onChange: (template: InvoiceTemplateType) => void;
}

const templates: { id: InvoiceTemplateType; name: string; description: string; preview: string }[] = [
    {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional clean layout with elegant typography',
        preview: '📄',
    },
    {
        id: 'modern',
        name: 'Modern',
        description: 'Bold gradients and vibrant colors',
        preview: '🎨',
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Ultra-clean with lots of whitespace',
        preview: '✨',
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'Corporate blue theme with structured layout',
        preview: '💼',
    },
];

const InvoiceTemplatePicker: React.FC<InvoiceTemplatePickerProps> = ({ selected, onChange }) => {
    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Invoice Template
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {templates.map((template) => (
                    <button
                        key={template.id}
                        type="button"
                        onClick={() => onChange(template.id)}
                        className={`
                            relative p-4 rounded-lg border-2 transition-all text-left
                            ${selected === template.id
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                : 'border-gray-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }
                        `}
                    >
                        {selected === template.id && (
                            <div className="absolute top-2 right-2">
                                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        <div className="text-3xl mb-2">{template.preview}</div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-1">
                            {template.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {template.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default InvoiceTemplatePicker;
