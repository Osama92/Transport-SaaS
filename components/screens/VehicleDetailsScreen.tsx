import React from 'react';
import type { Vehicle } from '../../types';
import { 
    ArrowLeftIcon, 
    PencilIcon, 
    WrenchScrewdriverIcon, 
    DocumentArrowUpIcon,
    EyeIcon,
    TrashIcon,
} from '../Icons';

interface VehicleDetailsScreenProps {
    vehicle: Vehicle;
    onBack: () => void;
    onUpdateStatus: () => void;
    onAddLog: () => void;
    onAddDocument: () => void;
}

const Stat: React.FC<{label: string, value: string | number}> = ({ label, value }) => (
    <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
);

const StatusBadge: React.FC<{ status: Vehicle['status'] }> = ({ status }) => {
    const statusClasses = {
        'Active': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'In-Shop': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        'Inactive': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{status}</span>;
};

const VehicleDetailsScreen: React.FC<VehicleDetailsScreenProps> = ({ vehicle, onBack, onUpdateStatus, onAddLog, onAddDocument }) => {
    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{vehicle.make} {vehicle.model} - <span className="font-mono">{vehicle.plateNumber}</span></h2>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={vehicle.status} />
                            <button onClick={onUpdateStatus} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Change</button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={onAddLog} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                        <WrenchScrewdriverIcon className="w-5 h-5"/> Add Maintenance Log
                    </button>
                     <button onClick={onAddDocument} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                        <DocumentArrowUpIcon className="w-5 h-5"/> Upload Document
                    </button>
                </div>
            </div>

            {/* Vehicle Info Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                <Stat label="Odometer" value={vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : 'N/A'} />
                <Stat label="VIN" value={vehicle.vin || 'N/A'} />
                <Stat label="Last Service" value={vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toLocaleDateString() : 'N/A'} />
                <Stat label="Next Service Due" value={vehicle.nextServiceDate ? new Date(vehicle.nextServiceDate).toLocaleDateString() : 'N/A'} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Maintenance History */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Maintenance History</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400 sticky top-0 bg-white dark:bg-slate-800">
                                <tr>
                                    <th className="py-3 px-4 font-medium">Date</th>
                                    <th className="py-3 px-4 font-medium">Type</th>
                                    <th className="py-3 px-4 font-medium">Description</th>
                                    <th className="py-3 px-4 font-medium">Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicle.maintenanceLogs.map(log => (
                                    <tr key={log.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(log.date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4"><span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-300">{log.type}</span></td>
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">{log.description}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">${log.cost.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {vehicle.maintenanceLogs.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">No maintenance logs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Documents */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Documents</h3>
                     <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b dark:border-slate-700 text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-slate-800">
                                <tr>
                                    <th className="py-3 px-4 font-medium">Name</th>
                                    <th className="py-3 px-4 font-medium">Expires</th>
                                    <th className="py-3 px-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicle.documents.map(doc => (
                                     <tr key={doc.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-gray-800 dark:text-gray-100">{doc.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{doc.type}</p>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(doc.expiryDate).toLocaleDateString()}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md dark:hover:bg-slate-700"><EyeIcon className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md dark:hover:bg-slate-700"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                     </tr>
                                ))}
                                {vehicle.documents.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">No documents uploaded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailsScreen;