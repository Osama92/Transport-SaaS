import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PayrollRun, Payslip } from '../../types';
import { ArrowLeftIcon, WalletIcon, CheckCircleIcon, ArrowDownTrayIcon, EyeIcon } from '../Icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PayslipPreview from '../payslip/PayslipPreview';
import { processPayroll, markPayrollRunAsPaid } from '../../services/firestore/payroll';
import { useAuth } from '../../contexts/AuthContext';

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
    const { organizationId } = useAuth();
    const [isGeneratingAllPdf, setIsGeneratingAllPdf] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const payslips = payrollRun.payslips || [];
    const totalAmount = payslips.reduce((sum, p) => sum + p.netPay, 0);

    const handleDownloadAllPayslips = () => {
        setIsGeneratingAllPdf(true);
    };

    const handleProcessPayroll = async () => {
        if (!organizationId) {
            setErrorMessage('Organization not found');
            return;
        }

        if (!confirm('Process this payroll? This will deduct ₦' + totalAmount.toLocaleString() + ' from your available balance.')) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);
        try {
            await processPayroll(payrollRun.id, organizationId);
            setSuccessMessage('Payroll processed successfully! Amount deducted from available balance.');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to process payroll');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkAsPaid = async () => {
        if (!confirm('Mark this payroll as paid? This will credit driver wallets with their net pay.')) {
            return;
        }

        setIsMarkingPaid(true);
        setErrorMessage(null);
        try {
            await markPayrollRunAsPaid(payrollRun.id);
            setSuccessMessage('Payroll marked as paid! Driver wallets have been credited.');
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to mark payroll as paid');
        } finally {
            setIsMarkingPaid(false);
        }
    };

    useEffect(() => {
        if (!isGeneratingAllPdf) return;
        
        const generatePdf = async () => {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const payslipIds = payslips.map(p => p.id);

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
            {/* Error Alert */}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 dark:bg-red-900/20 dark:border-red-800">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{errorMessage}</p>
                    </div>
                    <button onClick={() => setErrorMessage(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Success Alert */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 dark:bg-green-900/20 dark:border-green-800">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Success</h3>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">{successMessage}</p>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

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
                    <button
                        onClick={handleProcessPayroll}
                        disabled={payrollRun.status !== 'Draft' || isProcessing}
                        className="flex items-center gap-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <WalletIcon className="w-5 h-5"/> {isProcessing ? 'Processing...' : t('screens.payroll.processPayroll')}
                    </button>
                    <button
                        onClick={handleMarkAsPaid}
                        disabled={payrollRun.status !== 'Processed' || isMarkingPaid}
                        className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircleIcon className="w-5 h-5"/> {isMarkingPaid ? 'Marking...' : t('screens.payroll.markAsPaid')}
                    </button>
                     <button onClick={handleDownloadAllPayslips} disabled={isGeneratingAllPdf} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600 disabled:opacity-50">
                        <ArrowDownTrayIcon className="w-5 h-5"/> {isGeneratingAllPdf ? t('screens.payroll.generating') : t('screens.payroll.downloadAll')}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoPill label={t('screens.payroll.period')} value={payslips[0]?.payPeriod || 'N/A'} />
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
                            {payslips.map((payslip) => (
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
                    {payslips.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <h3 className="text-lg font-semibold">No payslips found</h3>
                            <p className="mt-1">This payroll run has no payslips associated with it.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Off-screen renderer for PDF generation */}
            {isGeneratingAllPdf && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                    {payslips.map(p => (
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