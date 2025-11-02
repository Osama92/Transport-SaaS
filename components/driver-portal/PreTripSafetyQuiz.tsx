/**
 * Pre-Trip Safety Quiz Modal
 * Interactive safety checklist that drivers must complete before starting a route
 * Gamified format with swipeable cards and visual feedback
 */

import React, { useState, useRef } from 'react';
import { InspectionItem, InspectionItemStatus } from '../../types';

interface PreTripSafetyQuizProps {
    vehicleName: string;
    onComplete: (items: InspectionItem[], timeToComplete: number) => void;
    onCancel: () => void;
}

interface ChecklistCategory {
    name: string;
    icon: string;
    items: Omit<InspectionItem, 'status' | 'notes' | 'photoUrl'>[];
}

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
    {
        name: 'Engine & Fluids',
        icon: '🔧',
        items: [
            { id: 'engine_oil', category: 'Engine & Fluids', question: 'Engine oil level', required: true },
            { id: 'coolant', category: 'Engine & Fluids', question: 'Radiator water/coolant level', required: true },
            { id: 'brake_fluid', category: 'Engine & Fluids', question: 'Brake fluid level', required: true },
            { id: 'power_steering', category: 'Engine & Fluids', question: 'Power steering fluid', required: false },
            { id: 'washer_fluid', category: 'Engine & Fluids', question: 'Windshield washer fluid', required: false },
        ]
    },
    {
        name: 'Tires & Brakes',
        icon: '🚗',
        items: [
            { id: 'tire_condition', category: 'Tires & Brakes', question: 'Tire condition (tread depth, no visible damage)', required: true },
            { id: 'tire_pressure', category: 'Tires & Brakes', question: 'All tires properly inflated', required: true },
            { id: 'brake_pads', category: 'Tires & Brakes', question: 'Brake pads condition', required: true },
            { id: 'spare_tire', category: 'Tires & Brakes', question: 'Spare tire available and inflated', required: true },
        ]
    },
    {
        name: 'Safety Equipment',
        icon: '🛡️',
        items: [
            { id: 'fire_extinguisher', category: 'Safety Equipment', question: 'Fire extinguisher (present & not expired)', required: true },
            { id: 'warning_triangle', category: 'Safety Equipment', question: 'Warning triangle present', required: true },
            { id: 'first_aid', category: 'Safety Equipment', question: 'First aid kit available', required: false },
            { id: 'jack_spanner', category: 'Safety Equipment', question: 'Jack and wheel spanner present', required: true },
        ]
    },
    {
        name: 'Lights & Signals',
        icon: '💡',
        items: [
            { id: 'headlights', category: 'Lights & Signals', question: 'Headlights working', required: true },
            { id: 'tail_lights', category: 'Lights & Signals', question: 'Tail lights working', required: true },
            { id: 'brake_lights', category: 'Lights & Signals', question: 'Brake lights working', required: true },
            { id: 'turn_signals', category: 'Lights & Signals', question: 'Turn signals working', required: true },
            { id: 'hazard_lights', category: 'Lights & Signals', question: 'Hazard lights working', required: true },
        ]
    },
    {
        name: 'Visibility & Controls',
        icon: '🪟',
        items: [
            { id: 'side_mirrors', category: 'Visibility & Controls', question: 'Side mirrors intact and adjustable', required: true },
            { id: 'rear_mirror', category: 'Visibility & Controls', question: 'Rear-view mirror intact', required: true },
            { id: 'windshield', category: 'Visibility & Controls', question: 'Windshield (no cracks or damage)', required: true },
            { id: 'wipers', category: 'Visibility & Controls', question: 'Windshield wipers functional', required: true },
            { id: 'horn', category: 'Visibility & Controls', question: 'Horn working properly', required: true },
        ]
    },
    {
        name: 'Documents & Compliance',
        icon: '📄',
        items: [
            { id: 'registration', category: 'Documents & Compliance', question: 'Vehicle registration (valid & present)', required: true },
            { id: 'insurance', category: 'Documents & Compliance', question: 'Insurance certificate (valid)', required: true },
            { id: 'license', category: 'Documents & Compliance', question: 'Driver\'s license (valid)', required: true },
            { id: 'inspection_cert', category: 'Documents & Compliance', question: 'Vehicle inspection certificate', required: false },
        ]
    },
    {
        name: 'Structural Integrity',
        icon: '🔩',
        items: [
            { id: 'chassis', category: 'Structural Integrity', question: 'Chassis condition (no visible damage)', required: true },
            { id: 'suspension', category: 'Structural Integrity', question: 'Suspension (no unusual sounds or sag)', required: true },
            { id: 'doors', category: 'Structural Integrity', question: 'All doors close and lock properly', required: true },
            { id: 'cargo_area', category: 'Structural Integrity', question: 'Cargo area secure and clean', required: false },
        ]
    },
];

const PreTripSafetyQuiz: React.FC<PreTripSafetyQuizProps> = ({ vehicleName, onComplete, onCancel }) => {
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [responses, setResponses] = useState<Map<string, { status: InspectionItemStatus; notes?: string }>>(new Map());
    const [showNotes, setShowNotes] = useState<string | null>(null);
    const startTime = useRef(Date.now());

    const currentCategory = CHECKLIST_CATEGORIES[currentCategoryIndex];
    const totalItems = CHECKLIST_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
    const completedItems = responses.size;
    const progress = (completedItems / totalItems) * 100;

    const handleResponse = (itemId: string, status: InspectionItemStatus) => {
        const newResponses = new Map(responses);
        newResponses.set(itemId, { status });
        setResponses(newResponses);

        // Auto-advance if status is 'good'
        if (status === 'good') {
            setTimeout(() => {
                // Check if all items in current category are answered
                const allAnswered = currentCategory.items.every(item => newResponses.has(item.id));
                if (allAnswered && currentCategoryIndex < CHECKLIST_CATEGORIES.length - 1) {
                    setCurrentCategoryIndex(currentCategoryIndex + 1);
                }
            }, 300);
        }
    };

    const handleAddNotes = (itemId: string, notes: string) => {
        const newResponses = new Map(responses);
        const existing = newResponses.get(itemId);
        if (existing) {
            newResponses.set(itemId, { ...existing, notes });
        }
        setResponses(newResponses);
        setShowNotes(null);
    };

    const handleSubmit = () => {
        const timeToComplete = Math.floor((Date.now() - startTime.current) / 1000);

        const inspectionItems: InspectionItem[] = CHECKLIST_CATEGORIES.flatMap(category =>
            category.items.map(item => {
                const response = responses.get(item.id);
                return {
                    ...item,
                    status: response?.status || 'not_applicable',
                    notes: response?.notes,
                };
            })
        );

        onComplete(inspectionItems, timeToComplete);
    };

    const getStatusColor = (status: InspectionItemStatus) => {
        switch (status) {
            case 'good': return 'bg-green-500 hover:bg-green-600';
            case 'fair': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'poor': return 'bg-red-500 hover:bg-red-600';
            case 'missing': return 'bg-gray-500 hover:bg-gray-600';
            default: return 'bg-blue-500 hover:bg-blue-600';
        }
    };

    const getStatusEmoji = (status: InspectionItemStatus) => {
        switch (status) {
            case 'good': return '✅';
            case 'fair': return '⚠️';
            case 'poor': return '❌';
            case 'missing': return '🚫';
            default: return '❓';
        }
    };

    const canSubmit = responses.size === totalItems;
    const hasCriticalIssues = Array.from(responses.values()).some(r => r.status === 'poor' || r.status === 'missing');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 text-white">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0 mr-2">
                            <h2 className="text-lg sm:text-2xl font-bold truncate">Pre-Trip Safety Check</h2>
                            <p className="text-indigo-100 text-xs sm:text-sm mt-1 truncate">Vehicle: {vehicleName}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="flex-shrink-0 text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-colors"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{completedItems} of {totalItems} checks completed</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-white/30 rounded-full h-2.5">
                            <div
                                className="bg-white h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex overflow-x-auto border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900 scrollbar-hide">
                    {CHECKLIST_CATEGORIES.map((category, index) => {
                        const categoryCompleted = category.items.every(item => responses.has(item.id));
                        return (
                            <button
                                key={index}
                                onClick={() => setCurrentCategoryIndex(index)}
                                className={`flex-shrink-0 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                    currentCategoryIndex === index
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <span className="mr-1 sm:mr-2">{category.icon}</span>
                                <span className="hidden sm:inline">{category.name}</span>
                                <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                                {categoryCompleted && <span className="ml-1 sm:ml-2">✓</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                    {currentCategory.items.map((item) => {
                        const response = responses.get(item.id);
                        return (
                            <div
                                key={item.id}
                                className="border dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-slate-900"
                            >
                                <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                                            {item.question}
                                            {item.required && <span className="text-red-500 ml-1">*</span>}
                                        </p>
                                        {response?.notes && (
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 italic break-words">
                                                Note: {response.notes}
                                            </p>
                                        )}
                                    </div>
                                    {response && (
                                        <span className="text-xl sm:text-2xl flex-shrink-0">{getStatusEmoji(response.status)}</span>
                                    )}
                                </div>

                                {/* Status Buttons */}
                                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                    {['good', 'fair', 'poor', 'missing'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleResponse(item.id, status as InspectionItemStatus)}
                                            className={`py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg text-white text-xs sm:text-sm font-medium transition-all ${
                                                response?.status === status
                                                    ? getStatusColor(status as InspectionItemStatus) + ' ring-2 ring-offset-1 ring-indigo-500'
                                                    : 'bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {/* Add Notes Button */}
                                {response && response.status !== 'good' && (
                                    <button
                                        onClick={() => setShowNotes(item.id)}
                                        className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        {response.notes ? '✏️ Edit notes' : '➕ Add notes'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t dark:border-slate-700 p-2 sm:p-4 bg-gray-50 dark:bg-slate-900">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex gap-2 order-2 sm:order-1">
                            <button
                                onClick={() => setCurrentCategoryIndex(Math.max(0, currentCategoryIndex - 1))}
                                disabled={currentCategoryIndex === 0}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="hidden sm:inline">← Previous</span>
                                <span className="sm:hidden">←</span>
                            </button>
                            {currentCategoryIndex < CHECKLIST_CATEGORIES.length - 1 && (
                                <button
                                    onClick={() => setCurrentCategoryIndex(currentCategoryIndex + 1)}
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
                                >
                                    <span className="hidden sm:inline">Next →</span>
                                    <span className="sm:hidden">→</span>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-sm sm:text-base transition-all order-1 sm:order-2 ${
                                canSubmit
                                    ? hasCriticalIssues
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {canSubmit
                                ? hasCriticalIssues
                                    ? '⚠️ Submit with Issues'
                                    : '✅ Start Route'
                                : `Complete All (${completedItems}/${totalItems})`}
                        </button>
                    </div>
                </div>

                {/* Notes Modal */}
                {showNotes && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Notes</h3>
                            <textarea
                                autoFocus
                                defaultValue={responses.get(showNotes)?.notes || ''}
                                placeholder="Describe the issue or add details..."
                                className="w-full h-32 px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                        handleAddNotes(showNotes, e.currentTarget.value);
                                    }
                                }}
                            />
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowNotes(null)}
                                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={(e) => {
                                        const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                                        handleAddNotes(showNotes, textarea?.value || '');
                                    }}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                                >
                                    Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreTripSafetyQuiz;
