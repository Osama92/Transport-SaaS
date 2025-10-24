import * as admin from 'firebase-admin';
import { FirebaseQueries } from './firebaseQueries';

/**
 * Analytics Engine for generating business insights
 * Used by OpenAI to provide intelligent recommendations
 */

export class AnalyticsEngine {
    private queries: FirebaseQueries;

    constructor(db: admin.firestore.Firestore) {
        this.queries = new FirebaseQueries(db);
    }

    /**
     * Analyze route performance and efficiency
     */
    async analyzeRoutePerformance(params: {
        organizationId: string;
        period?: 'week' | 'month' | 'year';
    }): Promise<any> {
        try {
            const now = new Date();
            let startDate = new Date();

            // Calculate date range
            switch (params.period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setMonth(now.getMonth() - 1);
            }

            const routes = await this.queries.getRoutes({
                organizationId: params.organizationId,
                startDate: startDate.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0],
                limit: 1000
            });

            const totalRoutes = routes.length;
            const completedRoutes = routes.filter(r => r.status === 'Completed').length;
            const pendingRoutes = routes.filter(r => r.status === 'Pending').length;
            const inProgressRoutes = routes.filter(r => r.status === 'In Progress').length;
            const cancelledRoutes = routes.filter(r => r.status === 'Cancelled').length;

            const completionRate = totalRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0;
            const cancellationRate = totalRoutes > 0 ? (cancelledRoutes / totalRoutes) * 100 : 0;

            return {
                period: params.period || 'month',
                totalRoutes,
                completedRoutes,
                pendingRoutes,
                inProgressRoutes,
                cancelledRoutes,
                completionRate: completionRate.toFixed(2) + '%',
                cancellationRate: cancellationRate.toFixed(2) + '%',
                insight: this.generateRouteInsight(completionRate, cancellationRate)
            };
        } catch (error) {
            console.error('Error analyzing route performance:', error);
            return { error: 'Unable to analyze route performance' };
        }
    }

    /**
     * Analyze driver performance
     */
    async analyzeDriverPerformance(params: {
        organizationId: string;
        topN?: number;
    }): Promise<any> {
        try {
            const drivers = await this.queries.getDrivers({
                organizationId: params.organizationId,
                status: 'Active',
                limit: 100
            });

            const routes = await this.queries.getRoutes({
                organizationId: params.organizationId,
                limit: 1000
            });

            // Calculate routes per driver
            const driverStats = drivers.map(driver => {
                const driverRoutes = routes.filter(r => r.driverId === driver.id);
                const completedRoutes = driverRoutes.filter(r => r.status === 'Completed').length;

                return {
                    id: driver.id,
                    name: driver.name,
                    totalRoutes: driverRoutes.length,
                    completedRoutes,
                    status: driver.status,
                    completionRate: driverRoutes.length > 0 ?
                        ((completedRoutes / driverRoutes.length) * 100).toFixed(2) + '%' : '0%'
                };
            });

            // Sort by completed routes
            driverStats.sort((a, b) => b.completedRoutes - a.completedRoutes);

            const topDrivers = driverStats.slice(0, params.topN || 5);
            const idleDrivers = drivers.filter(d => {
                const driverRoutes = routes.filter(r => r.driverId === d.id && r.status === 'In Progress');
                return driverRoutes.length === 0;
            });

            return {
                totalActiveDrivers: drivers.length,
                topPerformers: topDrivers,
                idleDrivers: idleDrivers.map(d => ({ id: d.id, name: d.name })),
                insight: this.generateDriverInsight(drivers.length, idleDrivers.length, topDrivers)
            };
        } catch (error) {
            console.error('Error analyzing driver performance:', error);
            return { error: 'Unable to analyze driver performance' };
        }
    }

    /**
     * Analyze invoice status and revenue
     */
    async analyzeInvoices(params: {
        organizationId: string;
        period?: 'week' | 'month' | 'year';
    }): Promise<any> {
        try {
            const now = new Date();
            let startDate = new Date();

            switch (params.period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setMonth(now.getMonth() - 1);
            }

            const invoices = await this.queries.getInvoices({
                organizationId: params.organizationId,
                startDate: startDate.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0],
                limit: 1000
            });

            const totalInvoices = invoices.length;
            const paidInvoices = invoices.filter(i => i.status === 'Paid');
            const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
            const pendingInvoices = invoices.filter(i => i.status === 'Sent');

            const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const overdueRevenue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

            return {
                period: params.period || 'month',
                totalInvoices,
                paidInvoices: paidInvoices.length,
                overdueInvoices: overdueInvoices.length,
                pendingInvoices: pendingInvoices.length,
                totalRevenue: `₦${totalRevenue.toLocaleString()}`,
                pendingRevenue: `₦${pendingRevenue.toLocaleString()}`,
                overdueRevenue: `₦${overdueRevenue.toLocaleString()}`,
                overdueList: overdueInvoices.slice(0, 5).map(i => ({
                    id: i.id,
                    client: i.clientName,
                    amount: `₦${(i.total || 0).toLocaleString()}`,
                    dueDate: i.dueDate
                })),
                insight: this.generateInvoiceInsight(overdueInvoices.length, overdueRevenue)
            };
        } catch (error) {
            console.error('Error analyzing invoices:', error);
            return { error: 'Unable to analyze invoices' };
        }
    }

    /**
     * Analyze expenses and identify cost optimization opportunities
     */
    async analyzeExpenses(params: {
        organizationId: string;
        period?: 'week' | 'month' | 'year';
    }): Promise<any> {
        try {
            const now = new Date();
            let startDate = new Date();

            switch (params.period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setMonth(now.getMonth() - 1);
            }

            const expenses = await this.queries.getExpenses({
                organizationId: params.organizationId,
                startDate: startDate.toISOString().split('T')[0],
                endDate: now.toISOString().split('T')[0],
                limit: 1000
            });

            const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

            // Group by category
            const categoryBreakdown: { [key: string]: number } = {};
            expenses.forEach(exp => {
                const category = exp.category || 'Other';
                categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (exp.amount || 0);
            });

            // Find highest expense category
            const categories = Object.entries(categoryBreakdown)
                .map(([category, amount]) => ({ category, amount }))
                .sort((a, b) => b.amount - a.amount);

            return {
                period: params.period || 'month',
                totalExpenses: `₦${totalExpenses.toLocaleString()}`,
                numberOfExpenses: expenses.length,
                categoryBreakdown: categories.map(c => ({
                    category: c.category,
                    amount: `₦${c.amount.toLocaleString()}`,
                    percentage: ((c.amount / totalExpenses) * 100).toFixed(2) + '%'
                })),
                insight: this.generateExpenseInsight(categories, totalExpenses)
            };
        } catch (error) {
            console.error('Error analyzing expenses:', error);
            return { error: 'Unable to analyze expenses' };
        }
    }

    /**
     * Analyze fleet utilization
     */
    async analyzeFleet(params: {
        organizationId: string;
    }): Promise<any> {
        try {
            const vehicles = await this.queries.getVehicles({
                organizationId: params.organizationId,
                limit: 100
            });

            const routes = await this.queries.getRoutes({
                organizationId: params.organizationId,
                status: 'In Progress',
                limit: 1000
            });

            const activeVehicles = vehicles.filter(v => v.status === 'Active').length;
            const maintenanceVehicles = vehicles.filter(v => v.status === 'Maintenance').length;
            const outOfServiceVehicles = vehicles.filter(v => v.status === 'Out of Service').length;

            const vehiclesInUse = new Set(routes.map(r => r.vehicleId)).size;
            const idleVehicles = activeVehicles - vehiclesInUse;

            const utilizationRate = activeVehicles > 0 ?
                ((vehiclesInUse / activeVehicles) * 100).toFixed(2) : '0';

            return {
                totalVehicles: vehicles.length,
                activeVehicles,
                vehiclesInUse,
                idleVehicles,
                maintenanceVehicles,
                outOfServiceVehicles,
                utilizationRate: utilizationRate + '%',
                insight: this.generateFleetInsight(
                    parseFloat(utilizationRate),
                    idleVehicles,
                    maintenanceVehicles
                )
            };
        } catch (error) {
            console.error('Error analyzing fleet:', error);
            return { error: 'Unable to analyze fleet' };
        }
    }

    // Insight generation helpers
    private generateRouteInsight(completionRate: number, cancellationRate: number): string {
        if (completionRate >= 90) {
            return "Excellent route completion rate! Your operations are running smoothly.";
        } else if (completionRate >= 75) {
            return "Good route completion rate, but there's room for improvement.";
        } else if (cancellationRate > 15) {
            return "High cancellation rate detected. Consider investigating common cancellation reasons.";
        } else {
            return "Route completion rate needs attention. Review bottlenecks in your operations.";
        }
    }

    private generateDriverInsight(totalDrivers: number, idleDrivers: number, topDrivers: any[]): string {
        if (idleDrivers > totalDrivers * 0.3) {
            return `${idleDrivers} drivers are currently idle. Consider optimizing route assignments.`;
        } else if (topDrivers.length > 0 && topDrivers[0].completedRoutes > 20) {
            return `Your top driver ${topDrivers[0].name} has completed ${topDrivers[0].completedRoutes} routes! Consider rewarding high performers.`;
        } else {
            return "Driver utilization is balanced. Continue monitoring performance.";
        }
    }

    private generateInvoiceInsight(overdueCount: number, overdueAmount: number): string {
        if (overdueCount > 5) {
            return `You have ${overdueCount} overdue invoices totaling ₦${overdueAmount.toLocaleString()}. Consider sending payment reminders.`;
        } else if (overdueCount > 0) {
            return `${overdueCount} invoice(s) overdue. Follow up with clients for payment.`;
        } else {
            return "All invoices are on track! Your cash flow looks healthy.";
        }
    }

    private generateExpenseInsight(categories: any[], totalExpenses: number): string {
        if (categories.length > 0) {
            const topCategory = categories[0];
            const percentage = ((topCategory.amount / totalExpenses) * 100).toFixed(0);

            if (topCategory.category === 'Fuel' && parseFloat(percentage) > 40) {
                return `Fuel costs are ${percentage}% of total expenses. Consider fuel-efficient routes or vehicle maintenance.`;
            } else if (topCategory.category === 'Maintenance' && parseFloat(percentage) > 30) {
                return `Maintenance costs are high (${percentage}%). Review vehicle health and preventive maintenance schedules.`;
            } else {
                return `${topCategory.category} is your highest expense category at ${percentage}%.`;
            }
        }
        return "Expense tracking is in progress.";
    }

    private generateFleetInsight(utilizationRate: number, idleVehicles: number, maintenanceVehicles: number): string {
        if (utilizationRate < 50) {
            return `Fleet utilization is at ${utilizationRate}%. ${idleVehicles} vehicles are idle - consider increasing route coverage.`;
        } else if (maintenanceVehicles > 3) {
            return `${maintenanceVehicles} vehicles are in maintenance. Ensure preventive maintenance schedules are optimized.`;
        } else if (utilizationRate > 85) {
            return `Excellent fleet utilization at ${utilizationRate}%! Your fleet is being used efficiently.`;
        } else {
            return `Fleet utilization is at ${utilizationRate}%. Operations are running smoothly.`;
        }
    }
}
