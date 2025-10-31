import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../DashboardLayout';
import TestWhatsApp from '../TestWhatsApp';
import AddVehicleModal from '../modals/AddVehicleModal';
import AddDriverModal from '../modals/AddDriverModal';
import EditDriverModal from '../modals/EditDriverModal';
import CreateRouteModal from '../modals/CreateRouteModal';
import EditRouteModal from '../modals/EditRouteModal';
import AddClientModal from '../modals/AddClientModal';
import EditClientModal from '../modals/EditClientModal';
import AssignDriverModal from '../modals/AssignDriverModal';
import ProofOfDeliveryModal from '../modals/ProofOfDeliveryModal';
import SendFundsModal from '../modals/SendFundsModal';
import DriverDetailsModal from '../modals/DriverDetailsModal';
import ConfirmRemovalModal from '../modals/ConfirmRemovalModal';
import UpdateVehicleStatusModal from '../modals/UpdateVehicleStatusModal';
import AddMaintenanceLogModal from '../modals/AddMaintenanceLogModal';
import UploadDocumentModal from '../modals/UploadDocumentModal';
import EmailInvoiceModal from '../modals/EmailInvoiceModal';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import ProfileSettingsModal from '../modals/ProfileSettingsModal';
import AddExpenseModal from '../modals/AddExpenseModal';
import PayslipModal from '../modals/PayslipModal';
import CreatePayrollRunModal from '../modals/CreatePayrollRunModal'; // Import the new modal
import EditDriverPayModal from '../modals/EditDriverPayModal'; // Import the new pay modal
import ManageFundsModal from '../modals/ManageFundsModal';
import AddBonusModal from '../modals/AddBonusModal';
import DriversTable from '../DriversTable';
import VehiclesTable from '../VehiclesTable';
import ClientsTable from '../ClientsTable';
import RouteAssignmentTable from '../RouteAssignmentTable';
import StatCard from '../StatCard';
import type { Route, Driver, Vehicle, Client, DriverPerformanceData, MaintenanceLog, VehicleDocument, Invoice, InvoiceItem, Expense, Notification, PayrollRun, Payslip } from '../../types';
// Import Firestore hooks
import { useDrivers, useVehicles, useRoutes, useClients, usePayrollRuns, useNotifications, useInvoices } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { getSubscriptionLimits } from '../../services/firestore/subscriptions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
// Import Firestore functions
import { deleteDriver, updateDriver } from '../../services/firestore/drivers';
import { deleteVehicle, updateVehicle } from '../../services/firestore/vehicles';
import { deleteRoute, assignRouteResources, startRoute, updateRoute, addRouteExpense, completeRoute, getRouteById } from '../../services/firestore/routes';
import { createClient, updateClient as updateClientFirestore, deleteClient, updateClientStatus } from '../../services/firestore/clients';
import { createPayrollRun, deletePayrollRun } from '../../services/firestore/payroll';
import { addFundsToWallet } from '../../services/firestore/wallet';
import { createInvoice, updateInvoice, deleteInvoice as deleteInvoiceFirestore, updateInvoiceStatus } from '../../services/firestore/invoices';
import { createBonus as createBonusFirestore } from '../../services/firestore/bonuses';
// Import notification triggers and handlers
import { notifyDriverAssigned, notifyRouteCompleted, notifyNewRoute, notifyDriverOnboarded, notifyExpenseAdded, notifyClientAdded, notifyPayrollGenerated } from '../../services/notificationTriggers';
import { markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../../services/firestore/notifications';
// Import WhatsApp notifications
import { whatsAppNotifications } from '../../services/whatsapp/whatsappService';
// Keep mock data functions for demo mode
import {
    generateDriverPerformanceData,
    getDrivers,
    getVehicles,
    getClients,
    getRoutes,
    getInvoices,
    getNotifications,
    getPayrollRuns,
    calculatePayslipsForPeriod,
} from '../../firebase/config';

import DriversScreen from '../screens/DriversScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import RoutesScreen from '../screens/RoutesScreen';
import RouteDetailsScreen from '../screens/RouteDetailsScreen';
import ClientsScreen from '../screens/ClientsScreen';
import InvoiceScreen from '../invoice/InvoiceScreenModern';
import AllInvoicesScreen from '../screens/AllInvoicesScreen';
import WalletScreen from '../screens/WalletScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AllNotificationsScreen from '../screens/AllNotificationsScreen';
import MapScreen from '../screens/MapScreen'; // Import MapScreen
import VehicleTrackingScreen from '../screens/VehicleTrackingScreen';
import PayrollScreen from '../screens/PayrollScreen';
import PayrollRunDetailsScreen from '../screens/PayrollRunDetailsScreen';
import PartnerAnalyticsScreen from '../screens/PartnerAnalyticsScreen';
import BonusManagementScreen from '../screens/BonusManagementScreen';
import InvoiceTemplate from '../invoice/InvoiceTemplates';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

import {
    PlusIcon,
    WalletIcon,
    CheckCircleIcon,
    ClockIcon,
} from '../Icons';
import {
    RoutesIcon,
    DriversIcon,
    VehiclesIcon,
    ClientsIcon,
} from '../NavIcons';

// Re-import MapPinIcon for StatCard (different from RoutesIcon)
import { MapPinIcon } from '../Icons';

// Import AI tooltip generator
import { generateAITooltip, type MetricData } from '../../services/ai/tooltipGenerator';
import LimitBadge from '../LimitBadge';

// Helper to format dates dynamically for mock data
const today = new Date();

// Generate raw analytics data once
let rawPerformanceData: DriverPerformanceData[] = [];

// --- Component ---

interface PartnerDashboardProps {
  onLogout: () => void;
  role: string;
  onSubscribeClick?: () => void;
}

type ModalType = 'addVehicle' | 'addDriver' | 'editDriver' | 'createRoute' | 'editRoute' | 'addClient' | 'editClient' | 'confirmDeleteClient' | 'confirmToggleClientStatus' | 'assignDriver' | 'viewPOD' | 'sendFunds' | 'driverDetails' | 'confirmRemoval' | 'updateVehicleStatus' | 'addMaintenanceLog' | 'uploadDocument' | 'emailInvoice' | 'confirmMarkAsPaid' | 'profileSettings' | 'addExpense' | 'viewPayslip' | 'createPayrollRun' | 'editDriverPay' | 'deletePayrollRun' | 'manageFunds' | 'addBonus' | null;
type RouteStatusFilter = 'All' | 'Pending' | 'In Progress' | 'Completed';
type InvoiceView = 'list' | 'create' | 'edit';

const WalletCard: React.FC<{ routes: Route[]; walletBalance?: number; onManageFunds: () => void }> = ({ routes, walletBalance = 0, onManageFunds }) => {
    const { t } = useTranslation();

    // Calculate expected earnings from completed routes
    const completedRoutes = routes.filter(r => r.status === 'Completed');
    const expectedEarnings = completedRoutes.reduce((total, route) => {
        // Calculate revenue from route rate
        const revenue = route.rate || 0;

        // Calculate total expenses for this route
        const totalExpenses = (route.expenses || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);

        // Net profit = revenue - expenses
        const netProfit = revenue - totalExpenses;

        return total + netProfit;
    }, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-4">
            {/* Top Section - Available Balance */}
            <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
                    <WalletIcon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('partnerDashboard.availableBalance')}</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 my-0.5">{formatCurrency(walletBalance)}</h2>
                    <button
                        onClick={onManageFunds}
                        className="text-xs sm:text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors">
                        Manage Funds
                    </button>
                </div>
            </div>

            {/* Bottom Section - Expected Earnings */}
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-green-100 dark:bg-green-900/50 flex-shrink-0">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Expected Earnings (Net Profit)</p>
                    <h3 className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 my-0.5">{formatCurrency(expectedEarnings)}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{completedRoutes.length} completed routes</p>
                </div>
            </div>
        </div>
    );
};

interface DashboardViewProps {
  setActiveNav: (nav: string) => void;
  setActiveModal: (modal: ModalType) => void;
  routes: Route[];
  drivers: Driver[];
  vehicles: Vehicle[];
  clients: Client[];
  onAssignRoute: (route: Route) => void;
  onViewDetails: (route: Route) => void;
  onCompleteRoute: (route: Route) => void;
  onFilterChange: (status: RouteStatusFilter) => void;
  activeFilter: RouteStatusFilter;
  onViewPendingRoutes: () => void;
  invoicedRouteIds: Set<string>;
  onEditRoute: (route: Route) => void;
  onDeleteRoute: (route: Route) => void;
  walletBalance: number;
  onManageFunds: () => void;
  // Driver actions
  onDriverSendFunds: (driver: Driver) => void;
  onDriverManageWallet: (driver: Driver) => void;
  onDriverViewDetails: (driver: Driver) => void;
  onDriverRemove: (driver: Driver) => void;
  onDriverEditPay: (driver: Driver) => void;
  onDriverEdit: (driver: Driver) => void;
  // Vehicle actions
  onVehicleViewDetails: (vehicle: Vehicle) => void;
  onVehicleUpdateStatus: (vehicle: Vehicle) => void;
  onVehicleRemove: (vehicle: Vehicle) => void;
  // Client actions
  onClientEdit: (client: Client) => void;
  onClientToggleStatus: (client: Client) => void;
  onClientDelete: (client: Client) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
    setActiveNav,
    setActiveModal,
    routes,
    drivers,
    vehicles,
    clients,
    onAssignRoute,
    onViewDetails,
    onCompleteRoute,
    onFilterChange,
    activeFilter,
    onViewPendingRoutes,
    invoicedRouteIds,
    onEditRoute,
    onDeleteRoute,
    walletBalance,
    onManageFunds,
    onDriverSendFunds,
    onDriverManageWallet,
    onDriverViewDetails,
    onDriverRemove,
    onDriverEditPay,
    onDriverEdit,
    onVehicleViewDetails,
    onVehicleUpdateStatus,
    onVehicleRemove,
    onClientEdit,
    onClientToggleStatus,
    onClientDelete
}) => {
    const { t } = useTranslation();
    const { organization, userRole, organizationId } = useAuth();

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const subscriptionLimits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');

    // Calculate current month route count
    const currentMonthRouteCount = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return routes.filter(route => {
            const createdAt = new Date(route.createdAt || '');
            return createdAt >= startOfMonth;
        }).length;
    }, [routes]);

    // Calculate real-time stats from routes data with month-over-month comparison
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Current month routes
    const currentMonthRoutes = routes.filter(r => {
        const createdAt = new Date(r.createdAt || '');
        return createdAt >= currentMonthStart;
    });

    // Last month routes
    const lastMonthRoutes = routes.filter(r => {
        const createdAt = new Date(r.createdAt || '');
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
    });

    // Calculate stats
    const totalRoutesAssigned = routes.filter(r => r.status === 'In Progress' || r.status === 'Completed').length;
    const totalCompletedRoutes = routes.filter(r => r.status === 'Completed').length;
    const totalPendingRoutes = routes.filter(r => r.status === 'Pending').length;

    // Calculate month-over-month changes
    const currentMonthAssigned = currentMonthRoutes.filter(r => r.status === 'In Progress' || r.status === 'Completed').length;
    const lastMonthAssigned = lastMonthRoutes.filter(r => r.status === 'In Progress' || r.status === 'Completed').length;
    const assignedChange = lastMonthAssigned > 0
        ? ((currentMonthAssigned - lastMonthAssigned) / lastMonthAssigned * 100).toFixed(1)
        : currentMonthAssigned > 0 ? '+100' : '0';
    const assignedChangeType: 'increase' | 'decrease' = currentMonthAssigned >= lastMonthAssigned ? 'increase' : 'decrease';

    const currentMonthCompleted = currentMonthRoutes.filter(r => r.status === 'Completed').length;
    const lastMonthCompleted = lastMonthRoutes.filter(r => r.status === 'Completed').length;
    const completedChange = lastMonthCompleted > 0
        ? ((currentMonthCompleted - lastMonthCompleted) / lastMonthCompleted * 100).toFixed(1)
        : currentMonthCompleted > 0 ? '+100' : '0';
    const completedChangeType: 'increase' | 'decrease' = currentMonthCompleted >= lastMonthCompleted ? 'increase' : 'decrease';

    const currentMonthPending = currentMonthRoutes.filter(r => r.status === 'Pending').length;
    const lastMonthPending = lastMonthRoutes.filter(r => r.status === 'Pending').length;
    const pendingChange = lastMonthPending > 0
        ? ((currentMonthPending - lastMonthPending) / lastMonthPending * 100).toFixed(1)
        : currentMonthPending > 0 ? '+100' : '0';
    const pendingChangeType: 'increase' | 'decrease' = currentMonthPending >= lastMonthPending ? 'increase' : 'decrease';

    // Generate AI-powered tooltips
    const assignedTooltip = generateAITooltip({
        name: 'routes_assigned',
        currentValue: currentMonthAssigned,
        previousValue: lastMonthAssigned,
        currentPeriod: 'month',
        change: parseFloat(assignedChange),
        changeType: assignedChangeType,
        context: {
            limit: subscriptionLimits?.routes,
            totalCount: totalRoutesAssigned
        }
    });

    const completedTooltip = generateAITooltip({
        name: 'routes_completed',
        currentValue: currentMonthCompleted,
        previousValue: lastMonthCompleted,
        currentPeriod: 'month',
        change: parseFloat(completedChange),
        changeType: completedChangeType,
        context: {
            totalCount: totalCompletedRoutes,
            relatedMetrics: {
                assigned: currentMonthAssigned,
                pending: currentMonthPending
            }
        }
    });

    const pendingTooltip = generateAITooltip({
        name: 'routes_pending',
        currentValue: currentMonthPending,
        previousValue: lastMonthPending,
        currentPeriod: 'month',
        change: parseFloat(pendingChange),
        changeType: pendingChangeType,
        context: {
            totalCount: totalPendingRoutes,
            relatedMetrics: {
                drivers: drivers.filter(d => d.status === 'Idle' || d.status === 'Available').length,
                vehicles: vehicles.filter(v => v.status === 'Active' || v.status === 'Parked').length
            }
        }
    });

    return (
        <div className="flex flex-col gap-8">
        {/* Stat Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <WalletCard routes={routes} walletBalance={walletBalance} onManageFunds={onManageFunds} />
            <StatCard
                title={t('partnerDashboard.totalRouteAssigned')}
                value={totalRoutesAssigned.toString()}
                change={`${assignedChangeType === 'increase' ? '+' : ''}${assignedChange}%`}
                changeType={assignedChangeType}
                description={t('partnerDashboard.thisMonth')}
                icon={<MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-blue-500" />}
                iconBg="bg-blue-100"
                tooltip={assignedTooltip}
            />
            <StatCard
                title={t('partnerDashboard.totalCompletedRoute')}
                value={totalCompletedRoutes.toString()}
                change={`${completedChangeType === 'increase' ? '+' : ''}${completedChange}%`}
                changeType={completedChangeType}
                description={t('partnerDashboard.thisMonth')}
                icon={<CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-green-500" />}
                iconBg="bg-green-100"
                tooltip={completedTooltip}
            />
            <div onClick={onViewPendingRoutes} className="cursor-pointer" role="button" tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter') onViewPendingRoutes();}}>
                <StatCard
                    title={t('partnerDashboard.pendingRoute')}
                    value={totalPendingRoutes.toString()}
                    change={`${pendingChangeType === 'increase' ? '+' : ''}${pendingChange}%`}
                    changeType={pendingChangeType}
                    description={t('partnerDashboard.awaitingStart')}
                    icon={<ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-orange-500" />}
                    iconBg="bg-orange-100"
                    tooltip={pendingTooltip}
                />
            </div>
        </div>

        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('partnerDashboard.hubTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('partnerDashboard.hubSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setActiveModal('createRoute')} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <RoutesIcon className="w-5 h-5"/>
                    {t('partnerDashboard.createRoute')}
                    <LimitBadge current={currentMonthRouteCount} limit={subscriptionLimits?.routes} />
                </button>
                <button onClick={() => setActiveModal('addDriver')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <DriversIcon className="w-5 h-5"/>
                    {t('partnerDashboard.addDriver')}
                    <LimitBadge current={drivers.length} limit={subscriptionLimits?.drivers} />
                </button>
                <button onClick={() => setActiveModal('addVehicle')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <VehiclesIcon className="w-5 h-5"/>
                    {t('partnerDashboard.addVehicle')}
                    <LimitBadge current={vehicles.length} limit={subscriptionLimits?.vehicles} />
                </button>
                <button onClick={() => setActiveModal('addClient')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <ClientsIcon className="w-5 h-5"/>
                    {t('partnerDashboard.addClient')}
                    <LimitBadge current={clients.length} limit={subscriptionLimits?.clients} />
                </button>
            </div>
        </div>

        {/* Management Tables Grid */}
        <div className="space-y-8">
            <DriversTable
                drivers={drivers.slice(0, 4)}
                onViewAll={() => setActiveNav('Drivers')}
                onSendFunds={onDriverSendFunds}
                onManageWallet={onDriverManageWallet}
                onViewDetails={onDriverViewDetails}
                onRemove={onDriverRemove}
                onEditPay={onDriverEditPay}
                onEditDriver={onDriverEdit}
            />
            <VehiclesTable
                vehicles={vehicles.slice(0,4)}
                onViewAll={() => setActiveNav('Vehicles')}
                onViewDetails={onVehicleViewDetails}
                onUpdateStatus={onVehicleUpdateStatus}
                onRemove={onVehicleRemove}
            />
        </div>
        <div>
            <RouteAssignmentTable
                routes={routes.slice(0, 5)}
                onAssign={onAssignRoute}
                onViewDetails={onViewDetails}
                onComplete={onCompleteRoute}
                onFilterChange={onFilterChange}
                activeFilter={activeFilter}
                selectedRoutes={[]}
                onSelectRoute={() => {}}
                onSelectAllCompleted={() => {}}
                invoicedRouteIds={invoicedRouteIds}
                onEdit={onEditRoute}
                onDelete={onDeleteRoute}
                onViewAll={() => setActiveNav('Routes')}
            />
        </div>
        <div>
            <ClientsTable
                clients={clients.slice(0, 5)}
                onViewAll={() => setActiveNav('Clients')}
                onEdit={onClientEdit}
                onToggleStatus={onClientToggleStatus}
                onDelete={onClientDelete}
            />
        </div>
        </div>
    );
};


const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onLogout, role, onSubscribeClick }) => {
  const { t } = useTranslation();
  const { currentUser, organizationId, organization, userRole } = useAuth();

  // Check if demo mode (demo@example.com)
  const isDemoMode = currentUser?.email === 'demo@example.com';

  // Use Firestore hooks for real data (only if not demo mode)
  const { data: firestoreDrivers, loading: driversLoading } = useDrivers(isDemoMode ? null : organizationId);
  const { data: firestoreVehicles, loading: vehiclesLoading } = useVehicles(isDemoMode ? null : organizationId);
  const { data: firestoreRoutes, loading: routesLoading } = useRoutes(isDemoMode ? null : organizationId);
  const { data: firestoreClients, loading: clientsLoading } = useClients(isDemoMode ? null : organizationId);
  const { data: firestorePayrollRuns, loading: payrollLoading } = usePayrollRuns(isDemoMode ? null : organizationId);
  const { data: firestoreNotifications, loading: notificationsLoading } = useNotifications(isDemoMode ? null : currentUser?.uid || null);
  const { data: firestoreInvoices, loading: invoicesLoading } = useInvoices(isDemoMode ? null : organizationId);

  const [organizationWalletBalance, setOrganizationWalletBalance] = useState<number>(0);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [selectedItem, setSelectedItem] = useState<Route | Driver | Vehicle | Invoice | Client | PayrollRun | Payslip | null>(null);
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // State for demo mode mock data
  const [mockRoutes, setMockRoutes] = useState<Route[]>([]);
  const [mockDrivers, setMockDrivers] = useState<Driver[]>([]);
  const [mockVehicles, setMockVehicles] = useState<Vehicle[]>([]);
  const [mockClients, setMockClients] = useState<Client[]>([]);
  const [mockInvoices, setMockInvoices] = useState<Invoice[]>([]);
  const [mockPayrollRuns, setMockPayrollRuns] = useState<PayrollRun[]>([]);
  const [mockNotifications, setMockNotifications] = useState<Notification[]>([]);

  // Use appropriate data source based on mode
  const routes = isDemoMode ? mockRoutes : (firestoreRoutes || []);
  const drivers = isDemoMode ? mockDrivers : (firestoreDrivers || []);
  const vehicles = isDemoMode ? mockVehicles : (firestoreVehicles || []);
  const clients = isDemoMode ? mockClients : (firestoreClients || []);
  const invoices = isDemoMode ? mockInvoices : (firestoreInvoices || []);
  const payrollRuns = isDemoMode ? mockPayrollRuns : (firestorePayrollRuns || []);
  const notifications = isDemoMode ? mockNotifications : (firestoreNotifications || []);

  // Calculate current month route count for subscription limits
  const currentMonthRouteCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRoutes = routes.filter(route => {
      if (!route.createdAt) return false;
      const createdAt = new Date(route.createdAt);
      if (isNaN(createdAt.getTime())) return false;
      return createdAt >= startOfMonth;
    });
    return monthRoutes.length;
  }, [routes]);

  // Get subscription limits
  const subscriptionPlan = organization?.subscription?.plan || 'basic';
  const subscriptionLimits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');

  const [routeStatusFilter, setRouteStatusFilter] = useState<RouteStatusFilter>('All');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [invoiceView, setInvoiceView] = useState<InvoiceView>('list');
  const [invoicedRouteIds, setInvoicedRouteIds] = useState<Set<string>>(new Set());
  const [viewingRoute, setViewingRoute] = useState<Route | null>(null);
  const [viewingPayrollRun, setViewingPayrollRun] = useState<PayrollRun | null>(null);
  const [showWhatsAppTest, setShowWhatsAppTest] = useState(false); // Toggle for WhatsApp test component

  // Data Fetching State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payroll Filter State
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<PayrollRun['status'] | 'All'>('All');
  const [payrollDateFilter, setPayrollDateFilter] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [isCreatingPayroll, setIsCreatingPayroll] = useState(false);
  const [isDeletingPayroll, setIsDeletingPayroll] = useState(false);

  // Analytics State
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [dateRange, setDateRange] = useState({ start: lastMonth, end: today });
  const [analyticsDriver1, setAnalyticsDriver1] = useState<string>('all');
  const [analyticsDriver2, setAnalyticsDriver2] = useState<string>('none');

  // Listen for organization wallet balance changes
  useEffect(() => {
    if (!organizationId || isDemoMode) {
      setOrganizationWalletBalance(1250750); // Demo mode default
      return;
    }

    // Real-time listener for organization wallet balance
    const unsubscribe = onSnapshot(
      doc(db, 'organizations', organizationId),
      (docSnap) => {
        if (docSnap.exists()) {
          const orgData = docSnap.data();
          setOrganizationWalletBalance(orgData.walletBalance || 0);
        }
      },
      (error) => {
        console.error('Error listening to organization:', error);
      }
    );

    return () => unsubscribe();
  }, [organizationId, isDemoMode]);

  // Only load data once when demo mode changes
  useEffect(() => {
    const loadAllData = async () => {
        // Only load mock data if in demo mode
        if (!isDemoMode) {
            // For production mode, everything handled by hooks
            setLoading(false);
            return;
        }

        // Demo mode - load all mock data
        try {
            setLoading(true);
            setError(null);
            const [
                driversData,
                vehiclesData,
                clientsData,
                routesData,
                invoicesData,
                notificationsData,
                payrollData,
            ] = await Promise.all([
                getDrivers(),
                getVehicles(),
                getClients(),
                getRoutes(),
                getInvoices(),
                getNotifications(),
                getPayrollRuns(),
            ]);

            const typedDriversData = driversData as Driver[];
            setMockDrivers(typedDriversData);
            setMockVehicles(vehiclesData as Vehicle[]);
            setMockClients(clientsData as Client[]);
            setMockRoutes(routesData as Route[]);
            setMockInvoices(invoicesData as Invoice[]);
            setMockNotifications(notificationsData as Notification[]);
            setMockPayrollRuns(payrollData as PayrollRun[]);
            rawPerformanceData = generateDriverPerformanceData(typedDriversData);

        } catch (err) {
            setError("Failed to load demo data. Please refresh the page.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    loadAllData();
  }, [isDemoMode]); // Removed firestoreDrivers dependency to prevent re-fetching

  // Generate analytics data when drivers update
  useEffect(() => {
    if (!isDemoMode && firestoreDrivers.length > 0) {
      rawPerformanceData = generateDriverPerformanceData(firestoreDrivers);
    }
  }, [firestoreDrivers, isDemoMode]);

  // Update viewingRoute when routes array changes (for expense updates)
  useEffect(() => {
    if (viewingRoute) {
      const updatedRoute = routes.find(r => r.id === viewingRoute.id);
      if (updatedRoute) {
        // Only update if expenses actually changed to avoid infinite loops
        const currentExpensesStr = JSON.stringify(viewingRoute.expenses || []);
        const newExpensesStr = JSON.stringify(updatedRoute.expenses || []);
        if (currentExpensesStr !== newExpensesStr) {
          setViewingRoute(updatedRoute);
        }
      }
    }
  }, [routes, viewingRoute]);
  
  const analyticsData = useMemo(() => {
    return rawPerformanceData.filter(d => {
      const recordDate = new Date(d.date);
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }, [dateRange]);
    

    useEffect(() => {
        const routeIdRegex = /(#R-\d+)/g;
        const allInvoicedIds = new Set<string>();
        invoices.forEach(invoice => {
            invoice.items.forEach(item => {
                const matches = item.description.match(routeIdRegex);
                if (matches) {
                    matches.forEach(id => allInvoicedIds.add(id));
                }
            });
        });
        setInvoicedRouteIds(allInvoicedIds);
    }, [invoices]);

  // Fix: Add handler for onVehicleUpdate to pass to VehiclesScreen
  const handleVehicleUpdate = (vehicleId: string, updates: Partial<Vehicle>) => {
    if (isDemoMode) {
      setMockVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, ...updates } : v));
    }
    // For production mode, update happens through Firestore
  };

  const handleOpenAssignModal = (route: Route) => {
    setSelectedItem(route);
    setActiveModal('assignDriver');
  };

  const handleViewDetails = (route: Route) => {
    if (route.status === 'In Progress' || route.status === 'Completed') {
        setViewingRoute(route);
    }
  };
  
  const handleCompleteRoute = async (route: Route) => {
    if (isDemoMode) {
      setMockRoutes(prev => prev.map(r => r.id === route.id ? { ...r, status: 'Completed', progress: 100 } : r));
      const vehicle = vehicles.find(v => v.plateNumber === route.vehicle);
      if (vehicle && route.distanceKm) {
        setMockVehicles(prev => prev.map(v =>
            v.id === vehicle.id ? { ...v, odometer: v.odometer + route.distanceKm } : v
        ));
      }
    } else {
      // For production mode, complete route in Firestore
      try {
        await completeRoute(route.id);

        // Clear driver status and current route (use assignedDriverId)
        if (route.assignedDriverId || route.driverId) {
          await updateDriver(route.assignedDriverId || route.driverId!, {
            status: 'Idle',
            currentRouteId: undefined,
            currentRouteStatus: undefined
          });
        }

        // Clear vehicle status and current route (use assignedVehicleId)
        if (route.assignedVehicleId || route.vehicleId) {
          await updateVehicle(route.assignedVehicleId || route.vehicleId!, {
            status: 'Parked',
            currentRouteId: undefined,
            currentRouteStatus: undefined
          });
        }

        console.log('Successfully completed route:', route.id);
      } catch (error) {
        console.error('Error completing route:', error);
        alert('Failed to complete route. Please try again.');
      }
    }
  };

  const handleEditRoute = (route: Route) => {
    // Only allow editing if route is not assigned (status is Pending)
    if (route.status !== 'Pending') {
      alert('You can only edit routes that have not been assigned to a driver or vehicle yet.');
      return;
    }
    setSelectedItem(route);
    setActiveModal('editRoute');
  };

  const handleUpdateRoute = async (updatedRoute: Route) => {
    if (isDemoMode) {
      // Demo mode: update in mock array
      setMockRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
    }
    // Production mode: Firestore hook will automatically update via updateRoute() in EditRouteModal
  };

  const handleDeleteRoute = async (route: Route) => {
    // Only allow deletion if route is not assigned (status is Pending)
    if (route.status !== 'Pending') {
      alert('You can only delete routes that have not been assigned to a driver or vehicle yet.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete route ${route.id}?`);
    if (!confirmed) return;

    if (isDemoMode) {
      setMockRoutes(prev => prev.filter(r => r.id !== route.id));
    } else {
      try {
        await deleteRoute(route.id);
        console.log('Successfully deleted route:', route.id);
      } catch (error) {
        console.error('Error deleting route:', error);
        alert('Failed to delete route. Please try again.');
      }
    }
  };

  const handleAssignDriver = async (routeId: string, driverId: string | number, vehicleId: string) => {
      // Handle both string IDs (production) and number IDs (demo)
      const driver = drivers.find(d => String(d.id) === String(driverId));
      const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
      if (driver && vehicle) {
          if (isDemoMode) {
              let updatedRoute: Route | undefined;
              setMockRoutes(prevRoutes => prevRoutes.map(r => {
                  if (r.id === routeId) {
                      updatedRoute = { ...r, status: 'In Progress', progress: 5, driverName: driver.name, driverAvatar: driver.avatar, vehicle: vehicle.plateNumber };
                      return updatedRoute;
                  }
                  return r;
              }));

              if (updatedRoute) {
                  setViewingRoute(updatedRoute);
              }
          } else {
              // For production mode, update Firestore
              try {
                  // Assign driver and vehicle to route
                  await assignRouteResources(
                      routeId,
                      String(driverId),
                      driver.name,
                      String(vehicleId),
                      vehicle.plateNumber
                  );

                  // Also update the denormalized fields for display
                  await updateRoute(routeId, {
                      driverName: driver.name,
                      driverAvatar: driver.avatar || 'https://picsum.photos/seed/placeholder/40/40',
                      vehicle: vehicle.plateNumber,
                      driverId: String(driverId),
                      vehicleId: String(vehicleId),
                  });

                  // Update driver status and current route
                  await updateDriver(String(driverId), {
                      status: 'On-route',
                      currentRouteId: routeId,
                      currentRouteStatus: 'In Progress'
                  });

                  // Update vehicle status and current route
                  await updateVehicle(String(vehicleId), {
                      status: 'On the Move',
                      currentRouteId: routeId,
                      currentRouteStatus: 'In Progress',
                      assignedDriverId: String(driverId)
                  });

                  // Start the route
                  await startRoute(routeId);

                  // Send notification to user
                  if (currentUser && organizationId) {
                      await notifyDriverAssigned(currentUser.uid, organizationId, driver.name, routeId);
                  }

                  // Send WhatsApp notification to driver if phone number exists and notifications enabled
                  if (driver.phone && driver.portalAccess?.whatsappNotifications !== false) {
                      try {
                          // Template expects: Driver Name ({{1}}), Route ID ({{2}})
                          await whatsAppNotifications.notifyDriverRouteAssigned(
                              driver.phone,
                              driver.name,
                              routeId
                          );
                          console.log('WhatsApp notification sent to driver:', driver.phone);
                      } catch (whatsappError) {
                          console.error('Failed to send WhatsApp notification:', whatsappError);
                          // Don't fail the assignment if WhatsApp fails
                      }
                  }

                  console.log('Successfully assigned driver and vehicle to route:', { routeId, driverId, vehicleId });
              } catch (error) {
                  console.error('Error assigning route:', error);
                  alert('Failed to assign driver and vehicle to route. Please try again.');
                  return; // Don't close modal on error
              }
          }
      }
      setActiveModal(null);
  };
  
  const handleAddExpense = async (routeId: string, newExpense: Expense) => {
    if (isDemoMode) {
      const updatedRoutes = routes.map(r => {
          if (r.id === routeId) {
              const updatedExpenses = [...(r.expenses || []), newExpense];
              return { ...r, expenses: updatedExpenses };
          }
          return r;
      });
      setMockRoutes(updatedRoutes);

      const updatedViewedRoute = updatedRoutes.find(r => r.id === routeId);
      if (updatedViewedRoute) {
          setViewingRoute(updatedViewedRoute);
      }
    } else {
      try {
        await addRouteExpense(routeId, {
          type: newExpense.type,
          description: newExpense.description,
          amount: newExpense.amount,
          date: newExpense.date,
        });

        // Fetch updated route with expenses for viewing
        const updatedRoute = await getRouteById(routeId);
        if (updatedRoute && viewingRoute && viewingRoute.id === routeId) {
          setViewingRoute(updatedRoute);
        }

        // Trigger refresh of routes list to pick up new expense
        window.dispatchEvent(new CustomEvent('refreshRoutes'));
      } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
        return;
      }
    }

    setActiveModal(null);
  };

  const handleCreateRoute = (routeData: { distanceKm: number; rate: number; stops: number; }) => {
    if (isDemoMode) {
      const newRoute: Route = {
        id: `#R-${Math.floor(Math.random() * 1000 + 5833)}`,
        driverName: 'Not Assigned',
        driverAvatar: 'https://picsum.photos/seed/placeholder/40/40',
        vehicle: 'N/A',
        progress: 0,
        status: 'Pending',
        expenses: [],
        ...routeData
      };
      setMockRoutes(prev => [newRoute, ...prev]);
    }
    // For production mode, route creation happens through Firestore in the modal
    setActiveModal(null);
  };

  const handleViewPendingRoutes = () => {
    setActiveNav('Routes');
    setRouteStatusFilter('Pending');
  };

  const handleDriverAction = (action: 'sendFunds' | 'driverDetails' | 'confirmRemoval' | 'editDriverPay' | 'editDriver' | 'manageDriverWallet', driver: Driver) => {
    setSelectedItem(driver);
    if (action === 'manageDriverWallet' || action === 'sendFunds') {
      // Both "Send Funds" and "Manage Wallet" use the same modal
      setActiveModal('manageFunds');
    } else {
      setActiveModal(action);
    }
  };

  const handleRemoveDriver = async (driverId: string | number) => {
    if (isDemoMode) {
      setMockDrivers(prev => prev.filter(d => d.id !== driverId));
    } else {
      // For production mode, delete from Firestore
      try {
        await deleteDriver(String(driverId));
      } catch (error) {
        console.error('Error deleting driver:', error);
        alert('Failed to delete driver. Please try again.');
      }
    }
    setActiveModal(null);
  };

  const handleRemoveVehicle = async (vehicleId: string | number) => {
    if (isDemoMode) {
      setMockVehicles(prev => prev.filter(v => v.id !== vehicleId));
    } else {
      // For production mode, delete from Firestore
      try {
        await deleteVehicle(String(vehicleId));
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Failed to delete vehicle. Please try again.');
      }
    }
  };

  const handleUpdateDriver = async (driverId: string, updates: Partial<Driver>) => {
    if (isDemoMode) {
      setMockDrivers(prev => prev.map(d => d.id === driverId ? { ...d, ...updates } : d));
    } else {
      try {
        await updateDriver(driverId, updates);
        setActiveModal(null);
        alert('Driver details updated successfully!');
      } catch (error) {
        console.error('Error updating driver:', error);
        alert('Failed to update driver details. Please try again.');
        return;
      }
    }
    setActiveModal(null);
  };

  const handleUpdateDriverPay = async (driverId: number, newPayInfo: {
    baseSalary: number;
    pensionContribution?: number;
    nhfContribution?: number;
    nhisContribution?: number;
    annualRent?: number;
    loanInterest?: number;
    lifeInsurance?: number;
  }) => {
    if (isDemoMode) {
      setMockDrivers(prev => prev.map(d => d.id === driverId ? { ...d, payrollInfo: { ...d.payrollInfo, ...newPayInfo } } : d));
      setActiveModal(null);
    } else {
      try {
        // Convert driverId to string for Firestore
        const driverIdStr = typeof driverId === 'string' ? driverId : `DRV-${driverId}`;

        // Prepare update payload - only include optional fields if they have values
        const updatePayload: any = {
          'payrollInfo.baseSalary': newPayInfo.baseSalary,
        };

        if (newPayInfo.pensionContribution !== undefined) {
          updatePayload['payrollInfo.pensionContribution'] = newPayInfo.pensionContribution;
        }
        if (newPayInfo.nhfContribution !== undefined) {
          updatePayload['payrollInfo.nhfContribution'] = newPayInfo.nhfContribution;
        }
        if (newPayInfo.nhisContribution !== undefined) {
          updatePayload['payrollInfo.nhisContribution'] = newPayInfo.nhisContribution;
        }
        if (newPayInfo.annualRent !== undefined) {
          updatePayload['payrollInfo.annualRent'] = newPayInfo.annualRent;
        }
        if (newPayInfo.loanInterest !== undefined) {
          updatePayload['payrollInfo.loanInterest'] = newPayInfo.loanInterest;
        }
        if (newPayInfo.lifeInsurance !== undefined) {
          updatePayload['payrollInfo.lifeInsurance'] = newPayInfo.lifeInsurance;
        }

        // Update driver payroll info in Firestore
        await updateDriver(driverIdStr, updatePayload);

        setActiveModal(null);
        alert('Driver pay information updated successfully!');
      } catch (error) {
        console.error('Error updating driver pay:', error);
        alert('Failed to update driver pay. Please try again.');
      }
    }
  };
  
  const handleShowModal = (modalType: ModalType, item?: any) => {
    if (item) setSelectedItem(item);
    setActiveModal(modalType);
  }

  const handleSelectRoute = (routeId: string) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]
    );
  };

  const handleSelectAllCompletedRoutes = () => {
      const completedRouteIds = filteredRoutes.filter(r => r.status === 'Completed' && !invoicedRouteIds.has(r.id)).map(r => r.id);
      const allSelected = completedRouteIds.length > 0 && completedRouteIds.every(id => selectedRoutes.includes(id));
      
      if (allSelected) {
          setSelectedRoutes(prev => prev.filter(id => !completedRouteIds.includes(id)));
      } else {
          setSelectedRoutes(prev => [...new Set([...prev, ...completedRouteIds])]);
      }
  };
  
  const handleCreateInvoiceFromSelection = () => {
      const routesForInvoice = routes.filter(r => selectedRoutes.includes(r.id));
      if(routesForInvoice.length === 0) return;

      const invoiceItems: InvoiceItem[] = routesForInvoice.map((route, index) => ({
          id: Date.now() + index,
          description: `Delivery for Route ${route.id} (${route.distanceKm} km)`,
          units: 1,
          price: route.distanceKm * 1250,
      }));
      
      const newInvoice: Invoice = {
        id: `#${(Math.random() * 100000).toFixed(0)}`,
        project: 'Bulk Route Invoicing',
        issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric'}),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric'}),
        from: { name: 'Your Company', address: '123 Logistics Lane', email: 'billing@logistics.com', phone: '(555) 123-4567' },
        to: { name: 'Default Client', address: '', email: '', phone: '' },
        items: invoiceItems,
        notes: `${routesForInvoice.length} routes included in this invoice.`,
        paymentDetails: { method: 'EFT Bank Transfer', accountName: 'Your Company', code: '123456', accountNumber: '987654321' },
        status: 'Draft',
    };

    setSelectedItem(newInvoice);
    setInvoiceView('create');
    setActiveNav('Invoices');
  };

  const handleSaveInvoice = async (invoice: Invoice) => {
    if (isDemoMode) {
      const existingIndex = mockInvoices.findIndex(inv => inv.id === invoice.id);
      if (existingIndex > -1) {
          const updatedInvoices = [...mockInvoices];
          updatedInvoices[existingIndex] = invoice;
          setMockInvoices(updatedInvoices);
      } else {
          setMockInvoices(prev => [invoice, ...prev]);
      }
    } else {
      try {
        const existingInvoice = invoices.find(inv => inv.id === invoice.id);
        if (existingInvoice) {
          // Update existing invoice
          await updateInvoice(invoice.id, invoice);
        } else {
          // Create new invoice
          await createInvoice(organizationId!, invoice, currentUser!.uid);
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Failed to save invoice. Please try again.');
        return;
      }
    }
    setInvoiceView('list');
    setActiveNav('Invoices');
    setSelectedItem(null);
    setSelectedRoutes([]);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (isDemoMode) {
      setMockInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv));
    } else {
      try {
        await updateInvoiceStatus(invoiceId, 'Paid');
      } catch (error) {
        console.error('Error marking invoice as paid:', error);
        alert('Failed to mark invoice as paid. Please try again.');
      }
    }
  };

  const handleRequestMarkAsPaid = (invoiceId: string) => {
      const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
      if (invoiceToUpdate) {
        setSelectedItem(invoiceToUpdate);
        setActiveModal('confirmMarkAsPaid');
      }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
      if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        if (isDemoMode) {
          setMockInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        } else {
          try {
            await deleteInvoiceFirestore(invoiceId);
          } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Failed to delete invoice. Please try again.');
          }
        }
      }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
      try {
          await generateInvoicePdf(invoice, invoice.template || 'pdf');
      } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Please try again.');
      }
  };
  
  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'status'>) => {
    if (isDemoMode) {
      const newClient: Client = {
        id: `C${Date.now()}`,
        ...newClientData,
        status: 'Active'
      };
      setMockClients(prev => [newClient, ...prev]);
    } else {
      try {
        await createClient(organizationId!, newClientData, currentUser!.uid);

        // Send notification about new client
        await notifyClientAdded(currentUser!.uid, organizationId!, newClientData.name);
      } catch (error) {
        console.error('Error creating client:', error);
        alert('Failed to create client. Please try again.');
        return;
      }
    }
    setActiveModal(null);
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    if (isDemoMode) {
      setMockClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    } else {
      try {
        const { id, organizationId, createdAt, createdBy, ...updates } = updatedClient;
        await updateClientFirestore(id, updates);
      } catch (error) {
        console.error('Error updating client:', error);
        alert('Failed to update client. Please try again.');
        return;
      }
    }
    setActiveModal(null);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (isDemoMode) {
      setMockClients(prev => prev.filter(c => c.id !== clientId));
    } else {
      try {
        await deleteClient(clientId);
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client. Please try again.');
        return;
      }
    }
    setActiveModal(null);
  };

  const handleToggleClientStatus = async (client: Client) => {
    const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    if (isDemoMode) {
      setMockClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
    } else {
      try {
        await updateClientStatus(client.id, newStatus);
      } catch (error) {
        console.error('Error updating client status:', error);
        alert('Failed to update client status. Please try again.');
        return;
      }
    }
    setActiveModal(null);
  };

  const handleUpdateNotification = async (id: number | string, updates: Partial<Notification>) => {
    if (isDemoMode) {
      // Mock mode - update state locally
      setMockNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
    } else {
      // Production mode - update Firestore
      if (typeof id === 'string' && updates.read !== undefined) {
        try {
          await markNotificationAsRead(id);
        } catch (error) {
          console.error('Error updating notification:', error);
        }
      }
    }
  };

  const handleDeleteNotification = async (id: number | string) => {
    if (isDemoMode) {
      // Mock mode - delete from state
      setMockNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      // Production mode - delete from Firestore
      if (typeof id === 'string') {
        try {
          await deleteNotification(id);
        } catch (error) {
          console.error('Error deleting notification:', error);
        }
      }
    }
  };

  const handleReadAll = async () => {
    if (isDemoMode) {
      // Mock mode - mark all as read in state
      setMockNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      // Production mode - mark all as read in Firestore
      if (currentUser) {
        try {
          await markAllNotificationsAsRead(currentUser.uid);
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
        }
      }
    }
  };

  const handleCreatePayrollRun = async (periodStart: string, periodEnd: string) => {
    setIsCreatingPayroll(true);
    try {
      if (isDemoMode) {
        // Demo mode: use mock calculation
        const newPayslips = await calculatePayslipsForPeriod(drivers, periodStart, periodEnd);
        const newRun: PayrollRun = {
            id: `PR-${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
            periodStart,
            periodEnd,
            payDate: new Date(new Date(periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days after period end
            status: 'Draft',
            payslips: newPayslips,
        };
        setMockPayrollRuns(prev => [newRun, ...prev]);
        setActiveModal(null);
      } else {
        // Production mode: use Firestore
        if (!organizationId || !currentUser) {
          alert('Organization or user information is missing. Please refresh the page.');
          return;
        }

        // Create payroll run in Firestore (will fetch drivers with their pay info)
        await createPayrollRun(organizationId, periodStart, periodEnd, drivers, currentUser.uid);

        setActiveModal(null);
        alert('Payroll run created successfully!');
      }
    } catch (error) {
      console.error('Error creating payroll run:', error);
      alert('Failed to create payroll run. Please ensure all drivers have pay information set.');
    } finally {
      setIsCreatingPayroll(false);
    }
  };

  const handleCreateBonus = async (bonus: any) => {
    if (!organizationId || !currentUser?.uid) {
      alert('Organization or user not found');
      return;
    }

    try {
      await createBonusFirestore(organizationId, bonus, currentUser.uid);
      setActiveModal(null);
      alert('Bonus created successfully! It must be approved before it appears in payroll.');
    } catch (error) {
      console.error('Error creating bonus:', error);
      alert('Failed to create bonus. Please try again.');
    }
  };

  const handleAddFunds = async (amount: number, method: string) => {
    if (!organizationId) {
      throw new Error('Organization not found');
    }

    if (isDemoMode) {
      // Demo mode: just update the state
      setOrganizationWalletBalance(prev => prev + amount);
      return;
    }

    // Production mode: Add to Firestore
    await addFundsToWallet(organizationId, amount, method);
    // Balance will update automatically via the real-time listener
  };

  const handleDeletePayrollRun = async (payrollRunId: string) => {
    setIsDeletingPayroll(true);
    try {
      if (isDemoMode) {
        // Demo mode: remove from mock array
        setMockPayrollRuns(prev => prev.filter(run => run.id !== payrollRunId));
      } else {
        // Production mode: delete from Firestore
        await deletePayrollRun(payrollRunId);
        alert('Payroll run deleted successfully!');
        // Trigger refresh
        window.dispatchEvent(new Event('refreshPayrollRuns'));
      }
    } catch (error) {
      console.error('Error deleting payroll run:', error);
      alert('Failed to delete payroll run.');
    } finally {
      setIsDeletingPayroll(false);
      setActiveModal(null);
    }
  };

  const filteredRoutes = routes.filter(route => {
    if (routeStatusFilter === 'All') return true;
    return route.status === routeStatusFilter;
  });
  
  const filteredPayrollRuns = useMemo(() => {
    return payrollRuns.filter(run => {
        const statusMatch = payrollStatusFilter === 'All' || run.status === payrollStatusFilter;

        const runDate = new Date(run.payDate);
        const startDate = payrollDateFilter.start;
        const endDate = payrollDateFilter.end;
        
        // Adjust endDate to be inclusive of the whole day
        const inclusiveEndDate = endDate ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
        
        const dateMatch = (!startDate || runDate >= startDate) && (!inclusiveEndDate || runDate <= inclusiveEndDate);

        return statusMatch && dateMatch;
    });
  }, [payrollRuns, payrollStatusFilter, payrollDateFilter]);

  const renderModal = () => {
    switch (activeModal) {
      case 'addVehicle':
        return <AddVehicleModal onClose={() => setActiveModal(null)} currentVehicleCount={vehicles.length} />;
      case 'addDriver':
        return <AddDriverModal onClose={() => setActiveModal(null)} currentDriverCount={drivers.length} onUpgradePlan={() => setActiveNav('Manage Subscription')} />;
      case 'editDriver':
        return <EditDriverModal driver={selectedItem as Driver} onClose={() => setActiveModal(null)} onSave={handleUpdateDriver} />;
      case 'createRoute':
        return <CreateRouteModal onClose={() => setActiveModal(null)} onAddRoute={handleCreateRoute} currentMonthRouteCount={currentMonthRouteCount} onUpgradePlan={() => setActiveNav('Manage Subscription')} />;
      case 'editRoute':
        return <EditRouteModal route={selectedItem as Route} onClose={() => setActiveModal(null)} onSave={handleUpdateRoute} />;
      case 'addClient':
        return <AddClientModal onClose={() => setActiveModal(null)} onAddClient={handleAddClient} currentClientCount={clients.length} />;
      case 'editClient':
        return <EditClientModal client={selectedItem as Client} onClose={() => setActiveModal(null)} onSave={handleUpdateClient} />;
      case 'confirmDeleteClient':
        const clientToDelete = selectedItem as Client;
        return <ConfirmActionModal 
            onClose={() => setActiveModal(null)}
            onConfirm={() => handleDeleteClient(clientToDelete.id)}
            title={t('modals.deleteClientTitle')}
            message={t('modals.deleteClientMessage', { name: clientToDelete.name })}
            confirmButtonText={t('common.remove')}
            isDestructive={true}
        />;
    case 'confirmToggleClientStatus':
        const clientToToggle = selectedItem as Client;
        const newStatus = clientToToggle.status === 'Active' ? 'Inactive' : 'Active';
        return <ConfirmActionModal
            onClose={() => setActiveModal(null)}
            onConfirm={() => handleToggleClientStatus(clientToToggle)}
            title={t('modals.toggleClientStatusTitle', { status: newStatus })}
            message={t('modals.toggleClientStatusMessage', { name: clientToToggle.name, status: newStatus.toLowerCase() })}
            confirmButtonText={t('modals.toggleClientStatusButton', { status: newStatus })}
        />;
      case 'assignDriver':
        return <AssignDriverModal onClose={() => setActiveModal(null)} route={selectedItem as Route} drivers={drivers.filter(d => d.status === 'Idle' || d.status === 'Available')} vehicles={vehicles.filter(v => v.status === 'Active' || v.status === 'Parked')} onAssign={handleAssignDriver} />;
      case 'viewPOD':
        return <ProofOfDeliveryModal onClose={() => setActiveModal(null)} route={selectedItem as Route} />;
      case 'driverDetails':
        return <DriverDetailsModal onClose={() => setActiveModal(null)} driver={selectedItem as Driver} />;
      case 'confirmRemoval':
        return <ConfirmRemovalModal onClose={() => setActiveModal(null)} driver={selectedItem as Driver} onConfirm={handleRemoveDriver} />;
      case 'updateVehicleStatus':
        return <UpdateVehicleStatusModal vehicle={selectedItem as Vehicle} onClose={() => setActiveModal(null)} onSave={async (vehicleId, newStatus) => {
          try {
            await updateVehicle(vehicleId, { status: newStatus });
            // Firestore hook will automatically update the vehicles list
            setActiveModal(null);
          } catch (error) {
            console.error('Error updating vehicle status:', error);
            alert('Failed to update vehicle status. Please try again.');
          }
        }} />;
      case 'addMaintenanceLog':
        return <AddMaintenanceLogModal vehicle={selectedItem as Vehicle} onClose={() => setActiveModal(null)} onSave={(vehicleId, newLog) => { setVehicles(prev => prev.map(v => v.id === vehicleId ? {...v, maintenanceLogs: [newLog, ...v.maintenanceLogs]} : v)); setActiveModal(null); }} />;
      case 'uploadDocument':
        return <UploadDocumentModal vehicle={selectedItem as Vehicle} onClose={() => setActiveModal(null)} onSave={(vehicleId, newDoc) => { setVehicles(prev => prev.map(v => v.id === vehicleId ? {...v, documents: [newDoc, ...v.documents]} : v)); setActiveModal(null); }} />;
      case 'emailInvoice':
          return <EmailInvoiceModal invoice={selectedItem as Invoice} onClose={() => setActiveModal(null)} onSend={(r,s,b) => { window.location.href = `mailto:${r}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`; setActiveModal(null); }} />
      case 'confirmMarkAsPaid':
        return <ConfirmActionModal 
            onClose={() => setActiveModal(null)}
            onConfirm={() => {
                if (selectedItem) {
                    handleMarkAsPaid((selectedItem as Invoice).id);
                }
                setActiveModal(null);
            }}
            title="Mark Invoice as Paid?"
            message={`Are you sure you want to mark invoice #${(selectedItem as Invoice)?.id} as paid? This will lock the invoice from future edits.`}
            confirmButtonText="Mark as Paid"
        />
      case 'profileSettings':
        return <ProfileSettingsModal onClose={() => setActiveModal(null)} />;
      case 'addExpense':
        return <AddExpenseModal route={viewingRoute} onClose={() => setActiveModal(null)} onSave={handleAddExpense} />;
      case 'viewPayslip':
        return <PayslipModal payslip={selectedItem as Payslip} onClose={() => setActiveModal(null)} />;
      case 'createPayrollRun':
        return <CreatePayrollRunModal onClose={() => setActiveModal(null)} onConfirm={handleCreatePayrollRun} isCreating={isCreatingPayroll} />;
      case 'editDriverPay':
        return <EditDriverPayModal driver={selectedItem as Driver} onClose={() => setActiveModal(null)} onSave={handleUpdateDriverPay} />;
      case 'addBonus':
        return <AddBonusModal drivers={drivers} onClose={() => setActiveModal(null)} onSave={handleCreateBonus} />;
      case 'deletePayrollRun':
        return <ConfirmActionModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onConfirm={async () => {
                if (selectedItem) {
                    await handleDeletePayrollRun((selectedItem as PayrollRun).id);
                }
                setActiveModal(null);
            }}
            title="Delete Payroll Run?"
            message={`Are you sure you want to delete this payroll run? This action cannot be undone. Period: ${(selectedItem as PayrollRun)?.periodStart} - ${(selectedItem as PayrollRun)?.periodEnd}`}
            confirmButtonText="Delete"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
        />;
      case 'manageFunds':
        const driverForWallet = selectedItem as Driver | null;
        return <ManageFundsModal
            currentBalance={driverForWallet ? (driverForWallet.walletBalance || 0) : organizationWalletBalance}
            driverId={driverForWallet?.id}
            driverName={driverForWallet?.name}
            driverEmail={driverForWallet?.email}
            organizationId={organizationId}
            onClose={() => setActiveModal(null)}
            onAddFunds={handleAddFunds}
        />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
         return (
            <div className="flex h-full items-center justify-center text-center text-red-500">
                <div>
                    <h3 className="text-xl font-bold">Something went wrong</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    switch (activeNav) {
      case 'Dashboard':
        if (viewingRoute) {
            return <RouteDetailsScreen
                route={viewingRoute}
                onBack={() => setViewingRoute(null)}
                onAddExpenseClick={() => setActiveModal('addExpense')}
            />
        }
        return <DashboardView
            setActiveNav={setActiveNav}
            setActiveModal={setActiveModal}
            routes={filteredRoutes}
            drivers={drivers}
            vehicles={vehicles}
            clients={clients.slice(0, 3)}
            onAssignRoute={handleOpenAssignModal}
            onViewDetails={handleViewDetails}
            onCompleteRoute={handleCompleteRoute}
            onFilterChange={setRouteStatusFilter}
            activeFilter={routeStatusFilter}
            onViewPendingRoutes={handleViewPendingRoutes}
            invoicedRouteIds={invoicedRouteIds}
            onEditRoute={handleEditRoute}
            onDeleteRoute={handleDeleteRoute}
            walletBalance={organizationWalletBalance}
            onManageFunds={() => setActiveModal('manageFunds')}
            onDriverSendFunds={(driver) => { setSelectedItem(driver); setActiveModal('sendFunds'); }}
            onDriverManageWallet={(driver) => handleDriverAction('manageDriverWallet', driver)}
            onDriverViewDetails={(driver) => { setSelectedItem(driver); setActiveModal('driverDetails'); }}
            onDriverRemove={(driver) => { setSelectedItem(driver); setActiveModal('confirmRemoval'); }}
            onDriverEditPay={(driver) => { setSelectedItem(driver); setActiveModal('editDriverPay'); }}
            onDriverEdit={(driver) => { setSelectedItem(driver); setActiveModal('editDriver'); }}
            onVehicleViewDetails={(vehicle) => { setSelectedItem(vehicle); setActiveModal('updateVehicleStatus'); }}
            onVehicleUpdateStatus={(vehicle) => { setSelectedItem(vehicle); setActiveModal('updateVehicleStatus'); }}
            onVehicleRemove={(vehicle) => handleRemoveVehicle(vehicle.id)}
            onClientEdit={(client) => { setSelectedItem(client); setActiveModal('editClient'); }}
            onClientToggleStatus={(client) => { setClientToToggle(client); setActiveModal('confirmToggleClientStatus'); }}
            onClientDelete={(client) => { setClientToDelete(client); setActiveModal('confirmDeleteClient'); }}
        />;
      case 'Map':
        return <MapScreen items={drivers} />;
      case 'Fleet Tracking':
        return <VehicleTrackingScreen />;
      case 'Drivers':
        return <DriversScreen
          setActiveModal={(modal) => handleShowModal(modal)}
          drivers={drivers}
          onSendFunds={(driver) => handleDriverAction('sendFunds', driver)}
          onManageWallet={(driver) => handleDriverAction('manageDriverWallet', driver)}
          onViewDetails={(driver) => handleDriverAction('driverDetails', driver)}
          onRemove={(driver) => handleDriverAction('confirmRemoval', driver)}
          onEditPay={(driver) => handleDriverAction('editDriverPay', driver)}
          onEditDriver={(driver) => handleDriverAction('editDriver', driver)}
          onAddBonus={() => setActiveModal('addBonus')}
          dateRange={dateRange}
          selectedDriver1={analyticsDriver1}
          onDriver1Change={setAnalyticsDriver1}
          selectedDriver2={analyticsDriver2}
          onDriver2Change={setAnalyticsDriver2}
        />;
      case 'Vehicles':
        return <VehiclesScreen
          vehicles={vehicles}
          onVehicleUpdate={handleVehicleUpdate}
          setActiveModal={(modal, vehicle) => handleShowModal(modal, vehicle)}
          dateRange={dateRange}
          onRemove={(vehicle) => handleRemoveVehicle(vehicle.id)}
        />;
      case 'Routes':
        if (viewingRoute) {
            return <RouteDetailsScreen
                route={viewingRoute}
                onBack={() => setViewingRoute(null)}
                onAddExpenseClick={() => setActiveModal('addExpense')}
            />
        }
        return <RoutesScreen setActiveModal={(modal) => handleShowModal(modal)} routes={filteredRoutes} onAssign={handleOpenAssignModal} onViewDetails={handleViewDetails} onComplete={handleCompleteRoute} onFilterChange={setRouteStatusFilter} activeFilter={routeStatusFilter} selectedRoutes={selectedRoutes} onSelectRoute={handleSelectRoute} onSelectAllCompleted={handleSelectAllCompletedRoutes} onCreateInvoiceFromSelection={handleCreateInvoiceFromSelection} invoicedRouteIds={invoicedRouteIds} onEdit={handleEditRoute} onDelete={handleDeleteRoute} />;
      case 'Clients':
        return <ClientsScreen 
            clients={clients} 
            onAdd={() => handleShowModal('addClient')}
            onEdit={(client) => handleShowModal('editClient', client)}
            onDelete={(client) => handleShowModal('confirmDeleteClient', client)}
            onToggleStatus={(client) => handleShowModal('confirmToggleClientStatus', client)}
        />;
      case 'Invoices':
        if (invoiceView === 'list') {
          return <AllInvoicesScreen 
                    invoices={invoices} 
                    onCreateNew={() => { setSelectedItem(null); setInvoiceView('create'); }} 
                    onEdit={(invoice) => { setSelectedItem(invoice); setInvoiceView('edit'); }}
                    onDownloadPdf={handleDownloadPdf}
                    onMarkAsPaid={handleRequestMarkAsPaid}
                    onDelete={handleDeleteInvoice}
                 />;
        }
        return <InvoiceScreen 
                invoiceData={selectedItem as Invoice | null} 
                onSave={handleSaveInvoice}
                onCancel={() => { setInvoiceView('list'); setSelectedItem(null); }} 
                onEmailRequest={(invoice) => handleShowModal('emailInvoice', invoice)}
                clients={clients}
               />;
      case 'Analytics':
        return <PartnerAnalyticsScreen />;
      case 'Wallet':
        return <WalletScreen />;
      case 'Payroll':
        if (viewingPayrollRun) {
            return <PayrollRunDetailsScreen 
                payrollRun={viewingPayrollRun}
                onBack={() => setViewingPayrollRun(null)}
                onViewPayslip={(payslip) => handleShowModal('viewPayslip', payslip)}
            />;
        }
        return <PayrollScreen
            payrollRuns={filteredPayrollRuns}
            onViewDetails={(run) => setViewingPayrollRun(run)}
            onRunNewPayroll={() => setActiveModal('createPayrollRun')}
            onDeletePayrollRun={(run) => handleShowModal('deletePayrollRun', run)}
            statusFilter={payrollStatusFilter}
            onStatusFilterChange={setPayrollStatusFilter}
            dateFilter={payrollDateFilter}
            onDateFilterChange={setPayrollDateFilter}
            isDeletingPayroll={isDeletingPayroll}
        />;
      case 'Bonuses':
        return <BonusManagementScreen />;
      case 'Notifications':
        return (
          <AllNotificationsScreen
            notifications={notifications}
            onUpdateNotification={handleUpdateNotification}
            onDeleteNotification={handleDeleteNotification}
            onReadAll={handleReadAll}
          />
        );
      case 'Settings':
        return <SettingsScreen onBack={() => setActiveNav('Dashboard')} onManageSubscription={() => setActiveNav('Manage Subscription')} onTestWhatsApp={() => setShowWhatsAppTest(true)} />;
      case 'Manage Subscription':
        return <ManageSubscriptionScreen onBack={() => setActiveNav('Settings')} />;
      default:
        return <DashboardView
            setActiveNav={setActiveNav}
            setActiveModal={setActiveModal}
            routes={filteredRoutes}
            drivers={drivers}
            vehicles={vehicles}
            clients={clients.slice(0,3)}
            onAssignRoute={handleOpenAssignModal}
            onViewDetails={handleViewDetails}
            onCompleteRoute={handleCompleteRoute}
            onFilterChange={setRouteStatusFilter}
            activeFilter={routeStatusFilter}
            onViewPendingRoutes={handleViewPendingRoutes}
            invoicedRouteIds={invoicedRouteIds}
            onEditRoute={handleEditRoute}
            onDeleteRoute={handleDeleteRoute}
            walletBalance={organizationWalletBalance}
            onManageFunds={() => setActiveModal('manageFunds')}
            onDriverSendFunds={(driver) => { setSelectedItem(driver); setActiveModal('sendFunds'); }}
            onDriverManageWallet={(driver) => handleDriverAction('manageDriverWallet', driver)}
            onDriverViewDetails={(driver) => { setSelectedItem(driver); setActiveModal('driverDetails'); }}
            onDriverRemove={(driver) => { setSelectedItem(driver); setActiveModal('confirmRemoval'); }}
            onDriverEditPay={(driver) => { setSelectedItem(driver); setActiveModal('editDriverPay'); }}
            onDriverEdit={(driver) => { setSelectedItem(driver); setActiveModal('editDriver'); }}
            onVehicleViewDetails={(vehicle) => { setSelectedItem(vehicle); setActiveModal('updateVehicleStatus'); }}
            onVehicleUpdateStatus={(vehicle) => { setSelectedItem(vehicle); setActiveModal('updateVehicleStatus'); }}
            onVehicleRemove={(vehicle) => handleRemoveVehicle(vehicle.id)}
            onClientEdit={(client) => { setSelectedItem(client); setActiveModal('editClient'); }}
            onClientToggleStatus={(client) => { setClientToToggle(client); setActiveModal('confirmToggleClientStatus'); }}
            onClientDelete={(client) => { setClientToDelete(client); setActiveModal('confirmDeleteClient'); }}
        />;
    }
  };

  return (
    <DashboardLayout
      onLogout={onLogout}
      role={role}
      activeNav={activeNav}
      onNavChange={(nav) => { setViewingRoute(null); setViewingPayrollRun(null); setInvoiceView('list'); setActiveNav(nav); }}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onOpenProfileSettings={() => setActiveModal('profileSettings')}
      notifications={notifications}
      onSubscribeClick={onSubscribeClick}
    >
      {renderModal()}
      {/* WhatsApp Test Component - Toggle with button in Settings */}
      {showWhatsAppTest && (
        <div className="relative z-50">
          <TestWhatsApp />
          <button
            onClick={() => setShowWhatsAppTest(false)}
            className="fixed top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full z-50"
            title="Close WhatsApp Test"
          >
            ✕
          </button>
        </div>
      )}
      {renderContent()}
    </DashboardLayout>
  );
};

export default PartnerDashboard;

