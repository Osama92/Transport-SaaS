import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronDownIcon, AdjustmentsHorizontalIcon } from './Icons';

const COLORS = ['#8b5cf6', '#34d399', '#60a5fa', '#f59e0b'];

const MiniBarChart: React.FC<{ color: string }> = ({ color }) => (
    <div className="flex items-end h-8 gap-0.5">
        <div className="w-1.5 rounded-full" style={{ height: '40%', backgroundColor: color, opacity: 0.5 }}></div>
        <div className="w-1.5 rounded-full" style={{ height: '70%', backgroundColor: color }}></div>
        <div className="w-1.5 rounded-full" style={{ height: '50%', backgroundColor: color, opacity: 0.8 }}></div>
        <div className="w-1.5 rounded-full" style={{ height: '90%', backgroundColor: color }}></div>
        <div className="w-1.5 rounded-full" style={{ height: '30%', backgroundColor: color, opacity: 0.4 }}></div>
    </div>
);

const AnalyticView: React.FC = () => {
    const { t } = useTranslation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const data = [
      { name: t('dashboard.analytic_view_legend_last_month'), value: 140168737 },
      { name: t('dashboard.analytic_view_legend_delivered'), value: 32889750 },
      { name: t('dashboard.analytic_view_legend_pending'), value: 8139000 },
      { name: t('dashboard.analytic_view_legend_in_transit'), value: 189000 },
    ];
    
    const totalRevenue = data.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dashboard.analytic_view_title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.analytic_view_subtitle')}</p>
                </div>
                <button className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">
                    <AdjustmentsHorizontalIcon className="w-5 h-5"/>
                    {t('dashboard.analytic_view_filters')}
                    <ChevronDownIcon className="w-4 h-4"/>
                </button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={8}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data[0].value)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{data[0].name}</p>
                        <span className="mt-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/50 dark:text-green-300">↑ 86.80%</span>
                    </div>
                </div>
                <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.analytic_view_total_shipments')}</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalRevenue)}</p>
                        <MiniBarChart color="#34d399" />
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.analytic_view_legend_in_transit')}</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{data[3].value.toLocaleString()}</p>
                        <MiniBarChart color="#60a5fa" />
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.analytic_view_legend_delivered')}</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data[1].value)}</p>
                        <MiniBarChart color="#8b5cf6" />
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.analytic_view_legend_pending')}</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data[2].value)}</p>
                         <MiniBarChart color="#f59e0b" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticView;