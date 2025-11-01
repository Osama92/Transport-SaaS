import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Route } from '../../types';
import { 
    ArrowLeftIcon, 
    MapIcon,
    PlusIcon,
    ClipboardDocumentCheckIcon
} from '../Icons';

interface RouteDetailsScreenProps {
    route: Route;
    onBack: () => void;
    onAddExpenseClick: () => void;
}

const InfoRow: React.FC<{label: string, value: string | React.ReactNode}> = ({ label, value }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</span>
    </div>
);

const RouteDetailsScreen: React.FC<RouteDetailsScreenProps> = ({ route, onBack, onAddExpenseClick }) => {
    const { t } = useTranslation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const totalExpenses = route.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const balance = route.rate - totalExpenses;

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('routeDetails.title')} <span className="font-mono">{route.id}</span></h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('routeDetails.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details, Financials, Map/POD */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                        <InfoRow label={t('components.routeAssignmentTable.headerDriver')} value={
                            <div className="flex items-center gap-2">
                                <img src={route.driverAvatar} alt={route.driverName} className="w-6 h-6 rounded-full" />
                                {route.driverName}
                            </div>
                        } />
                        <InfoRow label={t('components.routeAssignmentTable.headerVehicle')} value={route.vehicle} />
                        <InfoRow label={t('common.status')} value={route.status} />
                        <InfoRow label={t('components.routeAssignmentTable.headerStops')} value={`${Math.round((Array.isArray(route.stops) ? route.stops.length : route.stops || 0) * (route.progress / 100))} / ${Array.isArray(route.stops) ? route.stops.length : route.stops || 0}`} />
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">{t('components.routeAssignmentTable.headerProgress')}</label>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${route.progress}%`}}></div>
                            </div>
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">{route.progress}% {t('routeDetails.complete')}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t('routeDetails.financials')}</h3>
                        <InfoRow label={t('routeDetails.routeRate')} value={formatCurrency(route.rate)} />
                        <InfoRow label={t('routeDetails.totalExpenses')} value={`-${formatCurrency(totalExpenses)}`} />
                        <div className="flex justify-between items-center py-2 border-t-2 mt-2 dark:border-slate-600">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('routeDetails.balance')}</span>
                            <span className={`text-lg font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(balance)}
                            </span>
                        </div>
                    </div>

                    {/* Proof of Delivery Section */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-500" />
                            Proof of Delivery
                        </h3>

                        {Array.isArray(route.stops) && route.stops.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {route.stops.map((stop) => (
                                    <div key={stop.id} className="border dark:border-slate-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                Stop {stop.sequence}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                stop.status === 'completed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                                            }`}>
                                                {stop.status === 'completed' ? 'Completed' : 'Pending'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                            {stop.address}
                                        </p>

                                        {stop.status === 'completed' && stop.podPhotoUrl ? (
                                            <div className="space-y-2">
                                                {/* POD Photo */}
                                                <div className="rounded-lg overflow-hidden border dark:border-slate-600">
                                                    <a href={stop.podPhotoUrl} target="_blank" rel="noopener noreferrer" title="View full image">
                                                        <img
                                                            src={stop.podPhotoUrl}
                                                            alt={`POD for Stop ${stop.sequence}`}
                                                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                                        />
                                                    </a>
                                                </div>

                                                {/* Recipient Info */}
                                                {stop.recipientName && (
                                                    <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Received by:</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{stop.recipientName}</p>
                                                        {stop.recipientPhone && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stop.recipientPhone}</p>
                                                        )}
                                                        {stop.completedAt && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                {new Date(stop.completedAt).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Delivery Notes */}
                                                {stop.deliveryNotes && (
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                                        <strong>Notes:</strong> {stop.deliveryNotes}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                                                {stop.status === 'completed' ? 'No POD uploaded' : 'Awaiting delivery'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400"/>
                                    <p className="mt-2 font-semibold">No stops available</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Expenses */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('routeDetails.expenses')}</h3>
                        <button onClick={onAddExpenseClick} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <PlusIcon className="w-5 h-5"/> {t('routeDetails.addExpense')}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                <tr>
                                    <th className="py-3 px-4 font-medium">{t('common.date')}</th>
                                    <th className="py-3 px-4 font-medium">{t('addExpense.type')}</th>
                                    <th className="py-3 px-4 font-medium">{t('common.description')}</th>
                                    <th className="py-3 px-4 font-medium text-right">{t('addExpense.amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {route.expenses && route.expenses.length > 0 ? (
                                    route.expenses.map(expense => (
                                        <tr key={expense.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(expense.date).toLocaleDateString()}</td>
                                            <td className="py-3 px-4"><span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-300">{expense.type}</span></td>
                                            <td className="py-3 px-4 text-gray-800 dark:text-gray-200">{expense.description}</td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-medium text-right">{formatCurrency(expense.amount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t('routeDetails.noExpenses')}</td></tr>
                                )}
                            </tbody>
                             <tfoot>
                                <tr className="border-t-2 dark:border-slate-600">
                                    <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-800 dark:text-gray-100">{t('routeDetails.totalExpenses')}</td>
                                    <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-100 text-right">{formatCurrency(totalExpenses)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteDetailsScreen;