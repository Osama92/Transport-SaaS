import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Vehicle, MaintenanceLog } from '../../types';

interface AddMaintenanceLogModalProps {
    onClose: () => void;
    vehicle: Vehicle | null;
    onSave: (vehicleId: string, newLog: MaintenanceLog) => void;
}

const InputField: React.FC<{label: string, id: string, type?: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean}> = 
    ({ label, id, type = 'text', value, onChange, required=false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} value={value} onChange={onChange} required={required} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);


const AddMaintenanceLogModal: React.FC<AddMaintenanceLogModalProps> = ({ onClose, vehicle, onSave }) => {
    const [log, setLog] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Service' as MaintenanceLog['type'],
        odometer: vehicle?.odometer || 0,
        description: '',
        cost: ''
    });

    if (!vehicle) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLog(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newLog: MaintenanceLog = {
            id: `M${Date.now()}`,
            ...log,
            odometer: Number(log.odometer),
            cost: Number(log.cost)
        };
        onSave(vehicle.id, newLog);
    };

    return (
        <ModalBase title={`Add Log for ${vehicle.plateNumber}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Log Type</label>
                        <select id="type" name="type" value={log.type} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                            <option>Service</option>
                            <option>Repair</option>
                            <option>Tires</option>
                            <option>Fuel</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <InputField label="Date" id="date" type="date" value={log.date} onChange={handleChange} required />
                    <InputField label="Odometer (km)" id="odometer" type="number" value={log.odometer} onChange={handleChange} required />
                    <InputField label="Cost ($)" id="cost" type="number" value={log.cost} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Notes</label>
                    <textarea id="description" name="description" value={log.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" required></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">Save Log</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AddMaintenanceLogModal;