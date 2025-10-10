import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Driver, Route, Vehicle, Client, Invoice, PayrollRun } from '../../types';
import CalendarPopover from '../CalendarPopover';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CurrencyDollarIcon, MapPinIcon, TruckIcon, UserGroupIcon, WrenchScrewdriverIcon, CalendarDaysIcon, ArrowDownTrayIcon } from '../Icons';

interface PartnerAnalyticsScreenProps {
    drivers: Driver[];
    routes: Route[];
    vehicles: Vehicle[];
    clients: Client[];
    invoices: Invoice[];
    payrollRuns: PayrollRun[];
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm ${className}`}>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-80 w-full">
            {children}
        </div>
    </div>
);

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const PartnerAnalyticsScreen: React.FC<PartnerAnalyticsScreenProps> = ({ drivers, routes, vehicles, clients, invoices, payrollRuns }) => {
    const { t } = useTranslation();
    const [dateRange, setDateRange] = useState({ start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: new Date() });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const analyticsData = React.useMemo(() => {
        const filteredRoutes = routes.filter(r => {
            if (!r.completionDate) return false;
            const completionDate = new Date(r.completionDate);
            return completionDate >= dateRange.start && completionDate <= dateRange.end;
        });

        const filteredInvoices = invoices.filter(i => {
            const issuedDate = new Date(i.issuedDate);
            return issuedDate >= dateRange.start && issuedDate <= dateRange.end;
        });
        
        const filteredPayrollRuns = payrollRuns.filter(run => {
            const payDate = new Date(run.payDate);
            return run.status === 'Paid' && payDate >= dateRange.start && payDate <= dateRange.end;
        });

        // Financial Summary Calculations
        const totalRevenue = filteredRoutes.reduce((sum, r) => sum + r.rate, 0);
        const totalRouteExpenses = filteredRoutes.reduce((sum, r) => sum + (r.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0), 0);
        const totalMaintenanceCosts = vehicles.flatMap(v => v.maintenanceLogs || [])
            .filter(log => {
                if (!log || !log.date) return false;
                const logDate = new Date(log.date);
                return logDate >= dateRange.start && logDate <= dateRange.end;
            })
            .reduce((sum, log) => sum + log.cost, 0);
        const totalPayrollPaid = filteredPayrollRuns.flatMap(run => run.payslips).reduce((sum, payslip) => sum + payslip.grossPay, 0);
        const totalOperatingExpenses = totalRouteExpenses + totalMaintenanceCosts + totalPayrollPaid;
        const netOperatingProfit = totalRevenue - totalOperatingExpenses;
        const expenseBreakdownData = [
            { name: 'Payroll', value: totalPayrollPaid },
            { name: 'Maintenance', value: totalMaintenanceCosts },
            { name: 'Route Expenses', value: totalRouteExpenses },
        ].filter(item => item.value > 0);

        // Revenue Trends
        const monthlyData: { [key: string]: { revenue: number; profit: number } } = {};
        filteredRoutes.forEach(r => {
            if (r.completionDate) {
                const month = new Date(r.completionDate).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthlyData[month]) monthlyData[month] = { revenue: 0, profit: 0 };
                const routeExpenses = r.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
                monthlyData[month].revenue += r.rate;
                monthlyData[month].profit += (r.rate - routeExpenses);
            }
        });
        const revenueTrendData = Object.entries(monthlyData).map(([name, data]) => ({ name, ...data })).reverse();

        // Driver Performance
        const driverPerformance = drivers.map(driver => {
            const driverRoutes = filteredRoutes.filter(r => r.driverName === driver.name);
            const totalRate = driverRoutes.reduce((sum, r) => sum + r.rate, 0);
            const driverExpenses = driverRoutes.reduce((sum, r) => sum + (r.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0), 0);
            return {
                name: driver.name.split(' ')[0],
                profitability: totalRate - driverExpenses,
            };
        }).sort((a,b) => b.profitability - a.profitability).slice(0, 5);
        
        // Client Insights
        const clientRevenue: { [key: string]: number } = {};
        filteredInvoices.forEach(invoice => {
            const clientName = invoice.to.name;
            if (!clientRevenue[clientName]) clientRevenue[clientName] = 0;
            invoice.items.forEach(item => clientRevenue[clientName] += item.price);
        });
        const clientRevenueData = Object.entries(clientRevenue).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value);
        
        // Fleet Utilization
        const fleetStatusData = Object.entries(
            vehicles.reduce((acc, v) => {
                acc[v.status] = (acc[v.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([name, value]) => ({ name, value }));


        return { totalRevenue, totalOperatingExpenses, netOperatingProfit, expenseBreakdownData, revenueTrendData, driverPerformance, clientRevenueData, fleetStatusData };

    }, [drivers, routes, vehicles, clients, invoices, payrollRuns, dateRange]);

    const handleDownloadStatement = () => {
        const input = document.getElementById('financial-summary-section');
        if (!input) return;

        setIsGeneratingPdf(true);
        html2canvas(input, { scale: 2, backgroundColor: '#ffffff' })
            .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Financial-Summary-${dateRange.start.toLocaleDateString()}-${dateRange.end.toLocaleDateString()}.pdf`);
            })
            .finally(() => setIsGeneratingPdf(false));
    };


    return (
        <div className="flex flex-col gap-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Partner Analytics Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Insights to drive your logistics business forward.</p>
                </div>
                 <div className="relative" ref={calendarRef}>
                    <button onClick={() => setIsCalendarOpen(prev => !prev)} className="flex items-center gap-2 text-sm text-gray-600 bg-white border dark:border-slate-600 hover:bg-gray-100 px-4 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">
                        <CalendarDaysIcon className="w-5 h-5"/>
                        <span>{dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}</span>
                    </button>
                    {isCalendarOpen && (
                        <CalendarPopover 
                            initialRange={dateRange}
                            onApply={(range) => { setDateRange(range); setIsCalendarOpen(false); }} 
                            onClose={() => setIsCalendarOpen(false)} 
                        />
                    )}
                </div>
            </div>
            
            {/* Financial Summary */}
            <div id="financial-summary-section" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Financial Statement</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cash flow from operating activities for the selected period.</p>
                    </div>
                    <button 
                        onClick={handleDownloadStatement}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5"/> {isGeneratingPdf ? 'Generating...' : 'Download Statement'}
                    </button>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6 dark:border-slate-700">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(analyticsData.totalRevenue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Operating Expenses</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(analyticsData.totalOperatingExpenses)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Net Operating Profit</p>
                        <p className={`text-2xl font-bold ${analyticsData.netOperatingProfit >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(analyticsData.netOperatingProfit)}</p>
                    </div>
                </div>
            </div>

            {/* Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <ChartCard title="Operating Expense Breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analyticsData.expenseBreakdownData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                cornerRadius={8}
                            >
                                {analyticsData.expenseBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Fleet Status">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analyticsData.fleetStatusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                label
                            >
                                {analyticsData.fleetStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS.slice(2)[index % COLORS.slice(2).length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                
                <ChartCard title="Revenue & Profit Trend" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.revenueTrendData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `${(value as number / 1000).toFixed(0)}k`} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" strokeWidth={2} />
                            <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit (Route-level)" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                 <ChartCard title="Top 5 Performing Drivers (by Profitability)">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.driverPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis type="number" tickFormatter={(value) => `${(value as number / 1000).toFixed(0)}k`} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={70} tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                            <Bar dataKey="profitability" name="Profitability" radius={[0, 4, 4, 0]}>
                                {analyticsData.driverPerformance.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue by Client">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                             <Pie 
                                data={analyticsData.clientRevenueData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={70} 
                                outerRadius={100} 
                                fill="#8884d8" 
                                paddingAngle={5}
                                cornerRadius={8}
                            >
                                {analyticsData.clientRevenueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS.slice(1)[index % COLORS.slice(1).length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
};

export default PartnerAnalyticsScreen;
