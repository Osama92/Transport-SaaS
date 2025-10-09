import React from 'react';
import ModalBase from './ModalBase';
import { ExclamationCircleIcon, TrashIcon } from '../Icons';

interface ConfirmActionModalProps {
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
    isDestructive?: boolean;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ onClose, onConfirm, title, message, confirmButtonText = "Confirm", isDestructive = false }) => {
    return (
        <ModalBase title={title} onClose={onClose}>
            <div className="text-center">
                 <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isDestructive ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
                    {isDestructive 
                        ? <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                        : <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    }
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-4" dangerouslySetInnerHTML={{ __html: message }} />
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
                    onClick={onConfirm} 
                    className={`${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white font-semibold py-2 px-6 rounded-lg`}
                >
                    {confirmButtonText}
                </button>
            </div>
        </ModalBase>
    );
};

export default ConfirmActionModal;