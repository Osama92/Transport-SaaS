import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Driver } from '../../types';

interface SendFundsModalProps {
    onClose: () => void;
    driver: Driver | null;
}

const SendFundsModal: React.FC<SendFundsModalProps> = ({ onClose, driver }) => {
    const [amount, setAmount] = useState('');

    if (!driver) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle fund sending logic
        console.log(`Sending ₦${amount} to ${driver.name}`);
        onClose();
    };

    return (
        <ModalBase title={`Send Funds to ${driver.name}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (NGN)</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">₦</span>
                        </div>
                        <input 
                            type="number" 
                            id="amount" 
                            name="amount" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00" 
                            className="w-full pl-7 pr-4 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" 
                            required
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Cancel</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg" disabled={!amount}>Send Funds</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default SendFundsModal;