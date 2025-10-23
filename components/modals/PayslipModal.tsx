import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Payslip } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { XMarkIcon } from '../Icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface PayslipModalProps {
    payslip: Payslip | null;
    onClose: () => void;
}

const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, onClose }) => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [isPrinting, setIsPrinting] = useState(false);

    if (!payslip) return null;

    const companyDetails = {
        name: currentUser?.displayName ? `${currentUser.displayName}'s Logistics` : 'Logistics Inc.',
        address: '123 Transport Way, Suite 100, Metro City, 12345',
        phone: '(555) 123-4567',
        email: currentUser?.email || 'contact@logistics.inc'
    };

    const handlePrint = () => {
        const input = document.getElementById('printable-payslip');
        if (!input) return;

        setIsPrinting(true);
        html2canvas(input, { scale: 2 })
            .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Payslip-${payslip.driverName}-${payslip.payPeriod}.pdf`);
            })
            .finally(() => setIsPrinting(false));
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };
    
    const totalDeductions = payslip.tax + payslip.pension + payslip.nhf;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col relative">
                <header className="flex justify-between items-center p-5 border-b dark:border-slate-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('screens.payroll.payslipTitle')} {payslip.driverName}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto">
                    <div id="printable-payslip" className="bg-white text-black">
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
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Pay Period</h4>
                                    <p className="font-semibold">{payslip.payPeriod}</p>
                                </div>
                            </div>

                            {/* Earnings & Deductions */}
                            <div className="grid grid-cols-2 gap-8 py-4">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b">{t('screens.payroll.earnings')}</h4>
                                    <div className="flex justify-between text-sm mb-1"><span>{t('screens.payroll.basePay')}</span> <span>{formatCurrency(payslip.basePay)}</span></div>
                                    <div className="flex justify-between text-sm"><span>{t('screens.payroll.bonuses')}</span> <span>{formatCurrency(payslip.bonuses)}</span></div>
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t font-semibold"><span>{t('screens.payroll.grossPay')}</span> <span>{formatCurrency(payslip.grossPay)}</span></div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b">{t('screens.payroll.deductions')}</h4>
                                    <div className="flex justify-between text-sm mb-1"><span>{t('screens.payroll.tax')}</span> <span>({formatCurrency(payslip.tax)})</span></div>
                                    <div className="flex justify-between text-sm mb-1"><span>{t('screens.payroll.pension')}</span> <span>({formatCurrency(payslip.pension)})</span></div>
                                    <div className="flex justify-between text-sm mb-1"><span>{t('screens.payroll.nhf')}</span> <span>({formatCurrency(payslip.nhf)})</span></div>
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t font-semibold"><span>{t('screens.payroll.totalDeductions')}</span> <span>({formatCurrency(totalDeductions)})</span></div>
                                </div>
                            </div>
                            
                            {/* Net Pay */}
                            <div className="mt-4 pt-4 border-t-2 border-gray-900">
                                <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                                    <span className="text-lg font-bold text-gray-900">{t('screens.payroll.netPay')}</span>
                                    <span className="text-xl font-bold text-gray-900">{formatCurrency(payslip.netPay)}</span>
                                </div>
                            </div>

                            <div className="text-xs text-center text-gray-500 mt-8">
                                This is a computer-generated document and does not require a signature.
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="flex justify-end p-4 border-t dark:border-slate-700">
                    <button onClick={handlePrint} disabled={isPrinting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">
                        {isPrinting ? t('screens.payroll.generating') : t('screens.payroll.print')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PayslipModal;