import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Vehicle, VehicleDocument } from '../../types';

interface UploadDocumentModalProps {
    onClose: () => void;
    vehicle: Vehicle | null;
    onSave: (vehicleId: string, newDoc: VehicleDocument) => void;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ onClose, vehicle, onSave }) => {
    const [doc, setDoc] = useState({
        name: '',
        type: 'Registration' as VehicleDocument['type'],
        expiryDate: ''
    });

    if (!vehicle) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDoc(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newDoc: VehicleDocument = {
            id: `D${Date.now()}`,
            fileUrl: '#', // Mock file URL
            ...doc
        };
        onSave(vehicle.id, newDoc);
    };

    return (
        <ModalBase title={`Upload Document for ${vehicle.plateNumber}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name</label>
                        <input type="text" id="name" name="name" value={doc.name} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
                    </div>
                     <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
                        <select id="type" name="type" value={doc.type} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                            <option>Registration</option>
                            <option>Insurance</option>
                            <option>License Renewal</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                    <input type="date" id="expiryDate" name="expiryDate" value={doc.expiryDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
                </div>
                 <div>
                    <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File</label>
                    <input type="file" id="file" name="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900" required />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">Upload and Save</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default UploadDocumentModal;