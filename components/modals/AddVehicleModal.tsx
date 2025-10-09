import React from 'react';
import ModalBase from './ModalBase';

interface AddVehicleModalProps {
    onClose: () => void;
}

const InputField: React.FC<{label: string, id: string, type?: string, placeholder: string, required?: boolean}> = ({ label, id, type = 'text', placeholder, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} required={required} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ onClose }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission logic
        console.log("Vehicle form submitted");
        onClose();
    };

    return (
        <ModalBase title="Add New Vehicle" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Make" id="make" placeholder="e.g., Ford" required />
                    <InputField label="Model" id="model" placeholder="e.g., Transit" required />
                    <InputField label="Year" id="year" type="number" placeholder="e.g., 2023" required />
                    <InputField label="License Plate" id="plate" placeholder="e.g., ABC-1234" required />
                </div>
                <InputField label="VIN (Vehicle Identification Number)" id="vin" placeholder="Enter 17-digit VIN" required />
                <InputField label="Initial Odometer (km)" id="odometer" type="number" placeholder="e.g., 50000" required />
                <div>
                    <label htmlFor="documents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Documents</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload registration, insurance, etc. (PDF, JPG)</p>
                    <input type="file" id="documents" name="documents" multiple className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900"/>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">Save Vehicle</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AddVehicleModal;