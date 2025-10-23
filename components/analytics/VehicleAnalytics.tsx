import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle, Route, RouteExpense } from '../../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CurrencyDollarIcon, WrenchScrewdriverIcon } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';
import { getRoutesByOrganization } from '../../services/firestore/routes';

interface VehicleAnalyticsProps {
    vehicles: Vehicle[];
    dateRange: { start: Date; end: Date };
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

const ChartCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-80">
            {children}
        </div>
    </div>
);

const SummaryCard: React.FC<{ title: string, value: string, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-slate-700">{icon}</div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</h2>
            </div>
        </div>
    </div>
);

const VehicleAnalytics: React.FC<VehicleAnalyticsProps> = ({ vehicles, dateRange }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState('all');
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const { organizationId } = useAuth();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    // Fetch routes with expenses from Firestore
    useEffect(() => {
        const fetchRoutes = async () => {
            if (!organizationId) return;

            try {
                setLoading(true);
                const fetchedRoutes = await getRoutesByOrganization(organizationId);
                setRoutes(fetchedRoutes);
            } catch (error) {
                console.error('Error fetching routes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoutes();
    }, [organizationId]);

    const { summaryData, spendingByCategory, costPerVehicle } = useMemo(() => {
        // Filter routes by selected vehicle
        const filteredRoutes = selectedVehicleId === 'all'
            ? routes
            : routes.filter(r => r.assignedVehicleId === selectedVehicleId || r.vehicleId === selectedVehicleId);

        // Get all expenses from filtered routes within date range
        const expenses: RouteExpense[] = filteredRoutes
            .flatMap(route => route.expenses || [])
            .filter(expense => expense && expense.date)
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= dateRange.start && expenseDate <= dateRange.end;
            });

        // Calculate total spending
        const totalSpending = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

        // Calculate fuel spending
        const fuelSpending = expenses
            .filter(expense => expense.type === 'Fuel')
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);

        // Calculate maintenance spending
        const maintenanceSpending = expenses
            .filter(expense => expense.type === 'Maintenance')
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);

        // Group expenses by category
        const categoryCosts = expenses.reduce((acc, expense) => {
            const type = expense.type || 'Other';
            acc[type] = (acc[type] || 0) + (expense.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        const spendingByCategory = Object.entries(categoryCosts).map(([name, value]) => ({ name, value }));

        // Calculate cost per vehicle
        const costPerVehicle = vehicles.map(vehicle => {
            // Find all routes for this vehicle
            const vehicleRoutes = routes.filter(
                r => r.assignedVehicleId === vehicle.id || r.vehicleId === vehicle.id
            );

            // Get all expenses for this vehicle's routes within date range
            const vehicleExpenses = vehicleRoutes
                .flatMap(route => route.expenses || [])
                .filter(expense => expense && expense.date)
                .filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= dateRange.start && expenseDate <= dateRange.end;
                });

            return {
                name: vehicle.plateNumber,
                cost: vehicleExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
            };
        }).sort((a, b) => b.cost - a.cost);

        return {
            summaryData: { totalSpending, fuelSpending, maintenanceSpending },
            spendingByCategory,
            costPerVehicle
        };

    }, [vehicles, routes, selectedVehicleId, dateRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
                <label htmlFor="vehicle-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyze:</label>
                <select
                    id="vehicle-select"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                >
                    <option value="all">All Vehicles</option>
                    {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>
                    ))}
                </select>
                 <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                    Showing data from {dateRange.start.toLocaleDateString()} to {dateRange.end.toLocaleDateString()}
                 </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard 
                    title={selectedVehicleId === 'all' ? 'Total Fleet Spending' : 'Total Vehicle Spending'}
                    value={formatCurrency(summaryData.totalSpending)}
                    icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500" />}
                />
                 <SummaryCard 
                    title="Total Fuel Costs"
                    value={formatCurrency(summaryData.fuelSpending)}
                    icon={<CurrencyDollarIcon className="w-8 h-8 text-orange-500" />}
                />
                <SummaryCard 
                    title="Total Maintenance Costs"
                    value={formatCurrency(summaryData.maintenanceSpending)}
                    icon={<WrenchScrewdriverIcon className="w-8 h-8 text-blue-500" />}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                    <ChartCard title="Spending Breakdown">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={spendingByCategory}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    innerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={5}
                                    cornerRadius={8}
                                >
                                    {spendingByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
                 <div className="lg:col-span-3">
                     <ChartCard title="Total Cost Per Vehicle">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={costPerVehicle.filter(v => v.cost > 0)}
                                    dataKey="cost"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8b5cf6"
                                    label
                                >
                                    {costPerVehicle.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

export default VehicleAnalytics;