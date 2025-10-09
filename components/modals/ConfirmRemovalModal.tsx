import React from 'react';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';
import { TrashIcon } from '../Icons';

interface ConfirmRemovalModalProps {
    onClose: () => void;
    driver: Driver | null;
    onConfirm: (driverId: number) => void;
}

const ConfirmRemovalModal: React.FC<ConfirmRemovalModalProps> = ({ onClose, driver, onConfirm }) => {
    if (!driver) return null;

    return (
        <ModalBase title="Confirm Removal" onClose={onClose}>
            <div className="text-center">
                 <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                    <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-4">
                    Are you sure you want to remove <strong className="text-gray-800 dark:text-gray-100">{driver.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-center gap-4 pt-6 mt-6 border-t dark:border-slate-700">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300"
                >
                    Cancel
                </button>
                <button 
                    type="button" 
                    onClick={() => onConfirm(driver.id)} 
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg"
                >
                    Remove
                </button>
            </div>
        </ModalBase>
    );
};

export default ConfirmRemovalModal;