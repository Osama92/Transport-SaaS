import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Shipment, Transporter } from '../../types';
import StatCard from '../StatCard';
import { CurrencyDollarIcon, CubeTransparentIcon, ClockIcon, ChartPieIcon } from '../Icons';

interface AnalyticsScreenProps {
    shipments: Shipment[];
    transporters: Transporter[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-80 w-full">
            {children}
        </div>
    </div>
);

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ shipments, transporters }) => {
    const { t } = useTranslation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const analyticsData = useMemo(() => {
        // 1. KPIs
        const totalCost = shipments.reduce((sum, s) => sum + s.cost, 0);
        const totalShipments = shipments.length;
        
        const completedShipments = shipments.filter(s => s.status === 'Completed' && s.completedTimestamp && s.trackingHistory && s.trackingHistory.length > 0);
        const totalDeliveryTimeHours = completedShipments.reduce((sum, s) => {
            const startTime = new Date(s.trackingHistory![0].timestamp).getTime();
            const endTime = new Date(s.completedTimestamp!).getTime();
            return sum + (endTime - startTime);
        }, 0) / (1000 * 60 * 60); // convert to hours
        const avgDeliveryTimeHours = completedShipments.length > 0 ? totalDeliveryTimeHours / completedShipments.length : 0;
        const avgDeliveryTimeDays = (avgDeliveryTimeHours / 24).toFixed(1);

        // 2. Monthly Costs (Bar Chart)
        const monthlyCosts: { [key: string]: number } = {};
        shipments.forEach(s => {
            const month = new Date(s.date).toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyCosts[month] = (monthlyCosts[month] || 0) + s.cost;
        });
        const monthlyCostsData = Object.entries(monthlyCosts).map(([name, cost]) => ({ name, cost })).reverse();

        // 3. Spending by Transporter (Pie Chart)
        const spendingByTransporter: { [key: string]: number } = {};
        shipments.forEach(s => {
            if (s.transporterId) {
                const transporterName = transporters.find(t => t.id === s.transporterId)?.name || 'Unknown';
                spendingByTransporter[transporterName] = (spendingByTransporter[transporterName] || 0) + s.cost;
            }
        });
        const spendingByTransporterData = Object.entries(spendingByTransporter).map(([name, value]) => ({ name, value }));
        
        // 4. Status Breakdown
        const statusCounts = shipments.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const statusBreakdownData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));


        return {
            totalCost,
            totalShipments,
            avgDeliveryTimeDays,
            monthlyCostsData,
            spendingByTransporterData,
            statusBreakdownData
        };
    }, [shipments, transporters]);
    
    if (shipments.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl p-8">
                <ChartPieIcon className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4"/>
                <h3 className="text-xl font-bold">{t('analytics.noData')}</h3>
                <p>Create some shipments to see your analytics.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
             <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('analytics.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.subtitle')}</p>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={t('analytics.totalCost')}
                    value={formatCurrency(analyticsData.totalCost)}
                    change="+15.2%"
                    changeType="increase"
                    description={t('analytics.totalCostDesc')}
                    icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500" />}
                    iconBg="bg-green-100"
                />
                <StatCard
                    title={t('analytics.totalShipments')}
                    value={analyticsData.totalShipments.toString()}
                    change="+5"
                    changeType="increase"
                    description={t('analytics.totalShipmentsDesc')}
                    icon={<CubeTransparentIcon className="w-8 h-8 text-blue-500" />}
                    iconBg="bg-blue-100"
                />
                <StatCard
                    title={t('analytics.avgDeliveryTime')}
                    value={`${analyticsData.avgDeliveryTimeDays} Days`}
                    change="-0.5d"
                    changeType="decrease"
                    description={t('analytics.avgDeliveryTimeDesc')}
                    icon={<ClockIcon className="w-8 h-8 text-purple-500" />}
                    iconBg="bg-purple-100"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-2">
                     <ChartCard title={t('analytics.monthlyCosts')}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.monthlyCostsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => formatCurrency(value as number)} tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                    cursor={{fill: 'rgba(128, 128, 128, 0.1)'}}
                                />
                                <Bar dataKey="cost" fill="#8884d8" name={t('analytics.cost')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
                
                 <ChartCard title={t('analytics.spendingByTransporter')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analyticsData.spendingByTransporterData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={8}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {analyticsData.spendingByTransporterData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                             <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
                
                <ChartCard title={t('analytics.statusBreakdown')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analyticsData.statusBreakdownData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                label
                            >
                                {analyticsData.statusBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

export default AnalyticsScreen;