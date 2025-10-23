import React from 'react';
import type { Payslip } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface PayslipPreviewProps {
    payslip: Payslip;
}

const PayslipPreview: React.FC<PayslipPreviewProps> = ({ payslip }) => {
    const { currentUser } = useAuth();
    
    // This component is only rendered when currentUser is available, so we can assume it exists.
    const companyDetails = {
        name: currentUser?.displayName ? `${currentUser.displayName}'s Logistics` : 'Logistics Inc.',
        address: '123 Transport Way, Suite 100, Metro City, 12345',
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const totalDeductions = payslip.tax + payslip.pension + payslip.nhf;

    return (
        <div className="bg-white text-black p-6">
            <div className="border border-gray-300 p-6 rounded-lg">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-300">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{companyDetails.name}</h2>
                        <p className="text-xs">{companyDetails.address}</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-gray-900 uppercase">Payslip</h1>
                        <p className="text-sm mt-1">Pay Date: {payslip.payDate}</p>
                    </div>
                </div>

                {/* Employee & Period Details */}
                <div className="grid grid-cols-2 gap-6 py-4 border-b border-gray-300">
                    <div>
                        <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Employee</h4>
                        <p className="font-semibold">{payslip.driverName}</p>
                        <p className="text-sm">Driver ID: {payslip.driverId}</p>
                        {payslip.bankInfo && (
                            <div className="mt-2 text-sm">
                                <p className="font-medium">{payslip.bankInfo.bankName}</p>
                                <p>{payslip.bankInfo.accountNumber}</p>
                                <p className="text-xs text-gray-600">{payslip.bankInfo.accountName}</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Pay Period</h4>
                        <p className="font-semibold">{payslip.payPeriod}</p>
                    </div>
                </div>

                {/* Earnings & Deductions */}
                <div className="grid grid-cols-2 gap-8 py-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b">Earnings</h4>
                        <div className="flex justify-between text-sm mb-1"><span>Base Pay</span> <span>{formatCurrency(payslip.basePay)}</span></div>
                        <div className="flex justify-between text-sm"><span>Bonuses</span> <span>{formatCurrency(payslip.bonuses)}</span></div>
                        <div className="flex justify-between text-sm mt-2 pt-2 border-t font-semibold"><span>Gross Pay</span> <span>{formatCurrency(payslip.grossPay)}</span></div>
                    </div>
                     <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b">Deductions</h4>
                        <div className="flex justify-between text-sm mb-1"><span>Tax (PAYE)</span> <span>({formatCurrency(payslip.tax)})</span></div>
                        <div className="flex justify-between text-sm mb-1"><span>Pension</span> <span>({formatCurrency(payslip.pension)})</span></div>
                        <div className="flex justify-between text-sm mb-1"><span>NHF</span> <span>({formatCurrency(payslip.nhf)})</span></div>
                        <div className="flex justify-between text-sm mt-2 pt-2 border-t font-semibold"><span>Total Deductions</span> <span>({formatCurrency(totalDeductions)})</span></div>
                    </div>
                </div>
                
                {/* Net Pay */}
                <div className="mt-4 pt-4 border-t-2 border-gray-900">
                     <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                        <span className="text-lg font-bold text-gray-900">Net Pay</span>
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(payslip.netPay)}</span>
                    </div>
                </div>

                <div className="text-xs text-center text-gray-500 mt-8">
                    This is a computer-generated document and does not require a signature.
                </div>
            </div>
        </div>
    );
};

export default PayslipPreview;