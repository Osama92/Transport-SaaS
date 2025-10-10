import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Route, Driver, Vehicle } from '../../types';

const SelectField: React.FC<{
    label: string, 
    id: string, 
    value: string,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    children: React.ReactNode
}> = ({ label, id, value, onChange, children }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <select id={id} name={id} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
            {children}
        </select>
    </div>
);

interface AssignDriverModalProps {
    onClose: () => void;
    route: Route | null;
    drivers: Driver[];
    vehicles: Vehicle[];
    onAssign: (routeId: string, driverId: string | number, vehicleId: string) => void;
}

const AssignDriverModal: React.FC<AssignDriverModalProps> = ({ onClose, route, drivers, vehicles, onAssign }) => {
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');

    if (!route) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDriver && selectedVehicle) {
            // Pass the driver ID as-is (could be string like "DRV-xxx" or number for demo)
            onAssign(route.id, selectedDriver, selectedVehicle);
        } else {
            // Handle validation error
            alert("Please select a driver and a vehicle.");
        }
    };

    return (
        <ModalBase title={`Assign Driver to Route ${route.id}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Select an available driver and vehicle to start this route.</p>
                
                <SelectField label="Assign Driver" id="driver" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                    <option value="">Select a driver...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
                
                <SelectField label="Assign Vehicle" id="vehicle" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                    <option value="">Select a vehicle...</option>
                     {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                </SelectField>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg" disabled={!selectedDriver || !selectedVehicle}>Assign and Start Route</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AssignDriverModal;