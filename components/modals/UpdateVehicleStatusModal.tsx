import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Vehicle } from '../../types';

interface UpdateVehicleStatusModalProps {
    onClose: () => void;
    vehicle: Vehicle | null;
    onSave: (vehicleId: string, newStatus: Vehicle['status']) => void;
}

const UpdateVehicleStatusModal: React.FC<UpdateVehicleStatusModalProps> = ({ onClose, vehicle, onSave }) => {
    const [status, setStatus] = useState<Vehicle['status']>(vehicle?.status || 'Parked');

    if (!vehicle) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(vehicle.id, status);
    };

    return (
        <ModalBase title={`Update Status for ${vehicle.plateNumber}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Status</label>
                    <select
                        id="status"
                        name="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Vehicle['status'])}
                        className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    >
                        <option value="On the Move">On the Move</option>
                        <option value="Parked">Parked</option>
                        <option value="Idle">Idle</option>
                        <option value="In-Shop">In-Shop</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">Save Changes</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default UpdateVehicleStatusModal;