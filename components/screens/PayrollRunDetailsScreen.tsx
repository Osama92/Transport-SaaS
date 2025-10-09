import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayrollRun, Payslip } from '../../types';
import { ArrowLeftIcon, WalletIcon, CheckCircleIcon, ArrowDownTrayIcon, EyeIcon } from '../Icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PayslipPreview from '../payslip/PayslipPreview';

interface PayrollRunDetailsScreenProps {
    payrollRun: PayrollRun;
    onBack: () => void;
    onViewPayslip: (payslip: Payslip) => void;
}

const InfoPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-gray-100 dark:bg-slate-700/50 p-3 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{label}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
);

const StatusBadge: React.FC<{ status: PayrollRun['status'] }> = ({ status }) => {
    const statusClasses = {
        'Paid': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Processed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Draft': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClasses[status]}`}>{status}</span>;
};

const PayrollRunDetailsScreen: React.FC<PayrollRunDetailsScreenProps> = ({ payrollRun, onBack, onViewPayslip }) => {
    const { t } = useTranslation();
    const [isGeneratingAllPdf, setIsGeneratingAllPdf] = useState(false);
    const totalAmount = payrollRun.payslips.reduce((sum, p) => sum + p.netPay, 0);

    const handleDownloadAllPayslips = () => {
        setIsGeneratingAllPdf(true);
    };

    useEffect(() => {
        if (!isGeneratingAllPdf) return;
        
        const generatePdf = async () => {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const payslipIds = payrollRun.payslips.map(p => p.id);

            for (let i = 0; i < payslipIds.length; i++) {
                const payslipElement = document.getElementById(`payslip-pdf-${payslipIds[i]}`);
                if (payslipElement) {
                    const canvas = await html2canvas(payslipElement, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    
                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                }
            }
            
            pdf.save(`Payroll-${payrollRun.id}.pdf`);
            setIsGeneratingAllPdf(false);
        };

        // Timeout to allow React to render the off-screen elements
        setTimeout(generatePdf, 100);

    }, [isGeneratingAllPdf, payrollRun]);


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                        <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.payroll.runDetailsTitle')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.payroll.runDetailsSubtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button disabled={payrollRun.status !== 'Draft'} className="flex items-center gap-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                        <WalletIcon className="w-5 h-5"/> {t('screens.payroll.processPayroll')}
                    </button>
                    <button disabled={payrollRun.status !== 'Processed'} className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                        <CheckCircleIcon className="w-5 h-5"/> {t('screens.payroll.markAsPaid')}
                    </button>
                     <button onClick={handleDownloadAllPayslips} disabled={isGeneratingAllPdf} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600 disabled:opacity-50">
                        <ArrowDownTrayIcon className="w-5 h-5"/> {isGeneratingAllPdf ? t('screens.payroll.generating') : t('screens.payroll.downloadAll')}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoPill label={t('screens.payroll.period')} value={payrollRun.payslips[0]?.payPeriod || 'N/A'} />
                <InfoPill label={t('screens.payroll.payDate')} value={payrollRun.payDate} />
                <InfoPill label={t('screens.payroll.totalAmount')} value={formatCurrency(totalAmount)} />
                <div className="bg-gray-100 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{t('common.status')}</p>
                    <StatusBadge status={payrollRun.status} />
                </div>
            </div>

            {/* Payslips Table */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                            <tr>
                                <th className="py-3 px-4 font-medium">{t('screens.payroll.driverName')}</th>
                                <th className="py-3 px-4 font-medium text-right">{t('screens.payroll.basePay')}</th>
                                <th className="py-3 px-4 font-medium text-right">{t('screens.payroll.bonuses')}</th>
                                <th className="py-3 px-4 font-medium text-right">{t('screens.payroll.totalDeductions')}</th>
                                <th className="py-3 px-4 font-medium text-right">{t('screens.payroll.netPay')}</th>
                                <th className="py-3 px-4 font-medium text-center">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollRun.payslips.map((payslip) => (
                                <tr key={payslip.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{payslip.driverName}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-right">{formatCurrency(payslip.basePay)}</td>
                                    <td className="py-3 px-4 text-green-600 dark:text-green-400 text-right">{formatCurrency(payslip.bonuses)}</td>
                                    <td className="py-3 px-4 text-red-600 dark:text-red-400 text-right">({formatCurrency(payslip.tax + payslip.pension + payslip.nhf)})</td>
                                    <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-100 text-right">{formatCurrency(payslip.netPay)}</td>
                                    <td className="py-3 px-4 text-center">
                                         <button onClick={() => onViewPayslip(payslip)} className="flex items-center justify-center mx-auto gap-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800/50 dark:hover:bg-indigo-900/20">
                                            <EyeIcon className="w-4 h-4" />
                                            {t('common.view')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Off-screen renderer for PDF generation */}
            {isGeneratingAllPdf && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                    {payrollRun.payslips.map(p => (
                        <div key={p.id} id={`payslip-pdf-${p.id}`}>
                            <PayslipPreview payslip={p} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PayrollRunDetailsScreen;