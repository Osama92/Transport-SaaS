import React, { useState } from 'react';
import ModalBase from './ModalBase';
import { Driver, Bonus } from '../../types';

interface AddBonusModalProps {
    drivers: Driver[];
    onClose: () => void;
    onSave: (bonus: Omit<Bonus, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
}

const AddBonusModal: React.FC<AddBonusModalProps> = ({ drivers, onClose, onSave }) => {
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [amount, setAmount] = useState<number>(50000);
    const [reason, setReason] = useState<string>('');
    const [bonusType, setBonusType] = useState<'One-Time' | 'Recurring'>('One-Time');
    const [payPeriod, setPayPeriod] = useState<string>('');

    // Generate pay period options (current month and future months)
    const generatePayPeriodOptions = () => {
        const options: string[] = [];
        const currentDate = new Date();

        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            options.push(monthYear);
        }

        return options;
    };

    const payPeriodOptions = generatePayPeriodOptions();

    // Set default pay period to current month
    React.useEffect(() => {
        if (!payPeriod && payPeriodOptions.length > 0) {
            setPayPeriod(payPeriodOptions[0]);
        }
    }, [payPeriodOptions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDriverId) {
            alert('Please select a driver');
            return;
        }

        if (!amount || amount <= 0) {
            alert('Please enter a valid bonus amount');
            return;
        }

        if (!reason.trim()) {
            alert('Please enter a reason for the bonus');
            return;
        }

        if (!payPeriod) {
            alert('Please select a pay period');
            return;
        }

        const selectedDriver = drivers.find(d => String(d.id) === selectedDriverId);

        if (!selectedDriver) {
            alert('Selected driver not found');
            return;
        }

        const bonus: Omit<Bonus, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
            driverId: selectedDriverId,
            driverName: selectedDriver.name,
            amount: amount,
            reason: reason.trim(),
            type: bonusType,
            payPeriod: payPeriod,
            status: 'Pending',
        };

        onSave(bonus);
    };

    return (
        <ModalBase title="Add Bonus" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Driver */}
                <div>
                    <label htmlFor="driver" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Select Driver <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="driver"
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100"
                        required
                    >
                        <option value="">-- Select Driver --</option>
                        {drivers.map(driver => (
                            <option key={driver.id} value={String(driver.id)}>
                                {driver.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bonus Amount */}
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bonus Amount (₦) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₦</span>
                        <input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100"
                            placeholder="50000"
                            min="0"
                            step="1000"
                            required
                        />
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100 resize-none"
                        placeholder="e.g., Performance Bonus Q4 2025, Christmas Bonus, Excellent Route Completion"
                        rows={3}
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This will appear on the driver's payslip
                    </p>
                </div>

                {/* Bonus Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bonus Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="bonusType"
                                value="One-Time"
                                checked={bonusType === 'One-Time'}
                                onChange={(e) => setBonusType(e.target.value as 'One-Time' | 'Recurring')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">One-Time</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="bonusType"
                                value="Recurring"
                                checked={bonusType === 'Recurring'}
                                onChange={(e) => setBonusType(e.target.value as 'One-Time' | 'Recurring')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Recurring</span>
                        </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Bonus will be paid once for the selected pay period
                    </p>
                </div>

                {/* Pay Period */}
                <div>
                    <label htmlFor="payPeriod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Pay Period
                    </label>
                    <select
                        id="payPeriod"
                        value={payPeriod}
                        onChange={(e) => setPayPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100"
                        required
                    >
                        {payPeriodOptions.map(period => (
                            <option key={period} value={period}>
                                {period}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Format: "Jan 2026" or "Dec 2025". Leave blank for current month: Oct 2025
                    </p>
                </div>

                {/* Note */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        <strong>Note:</strong> Bonus will be created with "Pending" status. It must be approved before it appears in payroll.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Create Bonus
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AddBonusModal;
