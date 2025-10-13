import React, { useMemo, useEffect, useState } from 'react';
import type { Driver, DriverPerformanceData, Route } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClockIcon, MapPinIcon, CheckCircleIcon, CalendarDaysIcon } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';
import { getRoutesByOrganization } from '../../services/firestore/routes';

interface AggregatedDayData {
    completedRoutes: number;
    totalDeliveries: number;
    onTimeDeliveries: number;
    distanceKm: number;
}

interface DriverAnalyticsProps {
    drivers: Driver[];
    dateRange: { start: Date; end: Date };
    selectedDriver1: string;
    onDriver1Change: (id: string) => void;
    selectedDriver2: string;
    onDriver2Change: (id: string) => void;
}

const ChartCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-lg">{icon}</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        </div>
        <div className="h-72">
            {children}
        </div>
    </div>
);

const DriverSelect: React.FC<{
    drivers: Driver[], 
    selectedValue: string, 
    onChange: (val: string) => void, 
    label: string,
    excludeId?: string | number,
    isComparison?: boolean
}> = ({ drivers, selectedValue, onChange, label, excludeId, isComparison = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <select
            value={selectedValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:focus:ring-indigo-500"
        >
            {isComparison ? 
                <option value="none">None</option> : 
                <option value="all">All Drivers</option>
            }
            {drivers.filter(d => d.id.toString() !== excludeId).map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
        </select>
    </div>
);


const DriverAnalytics: React.FC<DriverAnalyticsProps> = ({
    drivers, dateRange, selectedDriver1, onDriver1Change, selectedDriver2, onDriver2Change
}) => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const { organizationId } = useAuth();

    // Fetch routes from Firestore
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

    // Generate performance data from routes
    const performanceData = useMemo(() => {
        const data: DriverPerformanceData[] = [];

        // Group completed routes by driver and date
        const completedRoutes = routes.filter(r => r.status === 'Completed');

        completedRoutes.forEach(route => {
            const driverId = route.assignedDriverId || route.driverId;
            if (!driverId) return;

            // Use actual arrival time or created time for grouping by date
            const dateStr = route.actualArrivalTime
                ? new Date(route.actualArrivalTime).toISOString().split('T')[0]
                : new Date(route.createdAt).toISOString().split('T')[0];

            // Find existing record for this driver/date
            let record = data.find(d => d.driverId === driverId && d.date === dateStr);

            if (!record) {
                record = {
                    driverId: driverId as any, // Cast to match old type (number)
                    date: dateStr,
                    completedRoutes: 0,
                    totalDeliveries: 0,
                    onTimeDeliveries: 0,
                    distanceKm: 0
                };
                data.push(record);
            }

            // Increment metrics
            record.completedRoutes += 1;
            record.totalDeliveries += 1; // Each route is one delivery
            record.distanceKm += route.distanceKm || route.distance || 0;

            // Calculate on-time delivery (if arrival was before or at estimated time)
            if (route.estimatedArrivalTime && route.actualArrivalTime) {
                const estimated = new Date(route.estimatedArrivalTime);
                const actual = new Date(route.actualArrivalTime);
                if (actual <= estimated) {
                    record.onTimeDeliveries += 1;
                }
            } else {
                // If no time tracking, assume on-time
                record.onTimeDeliveries += 1;
            }
        });

        return data;
    }, [routes]);

    const { routesData, onTimeData, kmData } = useMemo(() => {
        const processData = (driverIdStr: string) => {
            const driverId = driverIdStr === 'all' ? 'all' : driverIdStr;

            const filtered = performanceData.filter(p =>
                driverId === 'all' || p.driverId.toString() === driverId
            );

            const aggregated: Record<string, AggregatedDayData> = {};

            filtered.forEach(curr => {
                const day = new Date(curr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (!aggregated[day]) {
                    aggregated[day] = { completedRoutes: 0, totalDeliveries: 0, onTimeDeliveries: 0, distanceKm: 0 };
                }
                aggregated[day].completedRoutes += curr.completedRoutes;
                aggregated[day].totalDeliveries += curr.totalDeliveries;
                aggregated[day].onTimeDeliveries += curr.onTimeDeliveries;
                aggregated[day].distanceKm += curr.distanceKm;
            });

            const chartData = Object.keys(aggregated).map((name) => {
                const values = aggregated[name];
                return {
                    name,
                    routes: values.completedRoutes,
                    rate: values.totalDeliveries > 0 ? (values.onTimeDeliveries / values.totalDeliveries) * 100 : 0,
                    km: values.distanceKm,
                };
            }).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
            
            return chartData;
        };

        const data1 = processData(selectedDriver1);
        const data2 = selectedDriver2 !== 'none' ? processData(selectedDriver2) : [];
        
        const mergedData = data1.map(d1 => {
            const d2 = data2.find(item => item.name === d1.name);
            return {
                name: d1.name,
                routes1: d1.routes,
                routes2: d2 ? d2.routes : null,
                rate1: d1.rate,
                rate2: d2 ? d2.rate : null,
                km1: d1.km,
                km2: d2 ? d2.km : null,
            };
        });

        const kmTotals = (driverIdStr: string) => {
            const driverId = driverIdStr === 'all' ? 'all' : driverIdStr;
            const filtered = performanceData.filter(p => driverId === 'all' || p.driverId.toString() === driverId);
            return filtered.reduce((sum, record) => sum + record.distanceKm, 0);
        }

        const barData = drivers.map(d => ({
            name: d.name.split(' ')[0], // short name
            km1: selectedDriver1 === 'all' || selectedDriver1 === d.id.toString() ? kmTotals(d.id.toString()) : null,
            km2: selectedDriver2 !== 'none' && (selectedDriver2 === 'all' || selectedDriver2 === d.id.toString()) ? kmTotals(d.id.toString()) : null,
        })).filter(d => d.km1 !== null || d.km2 !== null);


        return { routesData: mergedData, onTimeData: mergedData, kmData: barData };

    }, [performanceData, selectedDriver1, selectedDriver2, drivers]);
    
    const driver1Name = selectedDriver1 === 'all' ? 'All Drivers' : drivers.find(d => d.id.toString() === selectedDriver1)?.name || '';
    const driver2Name = selectedDriver2 === 'none' ? '' : (selectedDriver2 === 'all' ? 'All Drivers' : drivers.find(d => d.id.toString() === selectedDriver2)?.name || '');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <DriverSelect drivers={drivers} selectedValue={selectedDriver1} onChange={onDriver1Change} label="Select Driver" excludeId={selectedDriver2} />
                <DriverSelect drivers={drivers} selectedValue={selectedDriver2} onChange={onDriver2Change} label="Compare With" excludeId={selectedDriver1} isComparison />
                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg flex items-center gap-3">
                    <CalendarDaysIcon className="w-6 h-6 text-gray-500 dark:text-gray-400"/>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Date Range</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-2">
                    <ChartCard title="Completed Routes" icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={routesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                                <Legend />
                                <Line type="monotone" dataKey="routes1" stroke="#10b981" name={driver1Name} strokeWidth={2} />
                                {selectedDriver2 !== 'none' && <Line type="monotone" dataKey="routes2" stroke="#a78bfa" name={driver2Name} strokeWidth={2} />}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
                
                <ChartCard title="On-Time Delivery Rate" icon={<ClockIcon className="w-6 h-6 text-orange-500" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={onTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                            <YAxis domain={[80, 100]} unit="%" tick={{ fill: 'currentColor', fontSize: 12 }}/>
                            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Legend />
                            <Line type="monotone" dataKey="rate1" stroke="#8884d8" strokeWidth={2} name={driver1Name} />
                             {selectedDriver2 !== 'none' && <Line type="monotone" dataKey="rate2" stroke="#f472b6" strokeWidth={2} name={driver2Name} />}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Kilometers Covered" icon={<MapPinIcon className="w-6 h-6 text-blue-500" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kmData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }}/>
                            <YAxis unit="km" tick={{ fill: 'currentColor', fontSize: 12 }}/>
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}/>
                            <Legend />
                            <Line type="monotone" dataKey="km1" stroke="#3b82f6" name={driver1Name} strokeWidth={2}/>
                            {selectedDriver2 !== 'none' && <Line type="monotone" dataKey="km2" stroke="#60a5fa" name={driver2Name} strokeWidth={2} />}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

export default DriverAnalytics;