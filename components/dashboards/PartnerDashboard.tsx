import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../DashboardLayout';
import AddVehicleModal from '../modals/AddVehicleModal';
import AddDriverModal from '../modals/AddDriverModal';
import CreateRouteModal from '../modals/CreateRouteModal';
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
import DriversTable from '../DriversTable';
import VehiclesTable from '../VehiclesTable';
import ClientsTable from '../ClientsTable';
import RouteAssignmentTable from '../RouteAssignmentTable';
import StatCard from '../StatCard';
import type { Route, Driver, Vehicle, Client, DriverPerformanceData, MaintenanceLog, VehicleDocument, Invoice, InvoiceItem, Expense, Notification, PayrollRun, Payslip } from '../../types';
// Import Firestore hooks
import { useDrivers, useVehicles, useRoutes } from '../../hooks/useFirestore';
import { useAuth } from '../../contexts/AuthContext';
// Import Firestore delete functions
import { deleteDriver } from '../../services/firestore/drivers';
import { deleteVehicle } from '../../services/firestore/vehicles';
import { deleteRoute } from '../../services/firestore/routes';
import { deleteClient } from '../../services/firestore/clients';
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
import InvoiceScreen from '../invoice/InvoiceScreen';
import AllInvoicesScreen from '../screens/AllInvoicesScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import AllNotificationsScreen from '../screens/AllNotificationsScreen';
import MapScreen from '../screens/MapScreen'; // Import MapScreen
import PayrollScreen from '../screens/PayrollScreen';
import PayrollRunDetailsScreen from '../screens/PayrollRunDetailsScreen';
import PartnerAnalyticsScreen from '../screens/PartnerAnalyticsScreen';
import InvoicePreview from '../invoice/InvoicePreview';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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


// Helper to format dates dynamically for mock data
const today = new Date();

// Generate raw analytics data once
let rawPerformanceData: DriverPerformanceData[] = [];

// --- Component ---

interface PartnerDashboardProps {
  onLogout: () => void;
  role: string;
}

type ModalType = 'addVehicle' | 'addDriver' | 'createRoute' | 'addClient' | 'editClient' | 'confirmDeleteClient' | 'confirmToggleClientStatus' | 'assignDriver' | 'viewPOD' | 'sendFunds' | 'driverDetails' | 'confirmRemoval' | 'updateVehicleStatus' | 'addMaintenanceLog' | 'uploadDocument' | 'emailInvoice' | 'confirmMarkAsPaid' | 'profileSettings' | 'addExpense' | 'viewPayslip' | 'createPayrollRun' | 'editDriverPay' | null;
type RouteStatusFilter = 'All' | 'Pending' | 'In Progress' | 'Completed';
type InvoiceView = 'list' | 'create' | 'edit';

const WalletCard: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
                    <WalletIcon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('partnerDashboard.availableBalance')}</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 my-0.5">₦1,250,750</h2>
                    <button className="text-xs sm:text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                        Manage Funds
                    </button>
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
}

const DashboardView: React.FC<DashboardViewProps> = ({ setActiveNav, setActiveModal, routes, drivers, vehicles, clients, onAssignRoute, onViewDetails, onCompleteRoute, onFilterChange, activeFilter, onViewPendingRoutes, invoicedRouteIds }) => {
    const { t } = useTranslation();

    // Calculate real-time stats from routes data
    const totalRoutesAssigned = routes.filter(r => r.status === 'In Progress' || r.status === 'Completed').length;
    const totalCompletedRoutes = routes.filter(r => r.status === 'Completed').length;
    const totalPendingRoutes = routes.filter(r => r.status === 'Pending').length;

    return (
        <div className="flex flex-col gap-8">
        {/* Stat Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <WalletCard />
            <StatCard
                title={t('partnerDashboard.totalRouteAssigned')}
                value={totalRoutesAssigned.toString()}
                change="+5.2%"
                changeType="increase"
                description={t('partnerDashboard.thisMonth')}
                icon={<MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-blue-500" />}
                iconBg="bg-blue-100"
            />
            <StatCard
                title={t('partnerDashboard.totalCompletedRoute')}
                value={totalCompletedRoutes.toString()}
                change="+10.1%"
                changeType="increase"
                description={t('partnerDashboard.thisMonth')}
                icon={<CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-green-500" />}
                iconBg="bg-green-100"
            />
            <div onClick={onViewPendingRoutes} className="cursor-pointer" role="button" tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter') onViewPendingRoutes();}}>
                <StatCard
                    title={t('partnerDashboard.pendingRoute')}
                    value={totalPendingRoutes.toString()}
                    change="-2.5%"
                    changeType="decrease"
                    description={t('partnerDashboard.awaitingStart')}
                    icon={<ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-orange-500" />}
                    iconBg="bg-orange-100"
                />
            </div>
        </div>

        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('partnerDashboard.hubTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('partnerDashboard.hubSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setActiveModal('createRoute')} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <RoutesIcon className="w-5 h-5"/> {t('partnerDashboard.createRoute')}
                </button>
                <button onClick={() => setActiveModal('addDriver')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <DriversIcon className="w-5 h-5"/> {t('partnerDashboard.addDriver')}
                </button>
                <button onClick={() => setActiveModal('addVehicle')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <VehiclesIcon className="w-5 h-5"/> {t('partnerDashboard.addVehicle')}
                </button>
                <button onClick={() => setActiveModal('addClient')} className="flex items-center gap-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600">
                    <ClientsIcon className="w-5 h-5"/> {t('partnerDashboard.addClient')}
                </button>
            </div>
        </div>

        {/* Management Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DriversTable drivers={drivers.slice(0, 4)} onViewAll={() => setActiveNav('Drivers')} />
            <VehiclesTable vehicles={vehicles.slice(0,4)} onViewAll={() => setActiveNav('Vehicles')} onViewDetails={() => {}} onUpdateStatus={() => {}} />
        </div>
        <div>
            <RouteAssignmentTable 
                routes={routes} 
                onAssign={onAssignRoute} 
                onViewDetails={onViewDetails}
                onComplete={onCompleteRoute}
                onFilterChange={onFilterChange}
                activeFilter={activeFilter}
                selectedRoutes={[]}
                onSelectRoute={() => {}}
                onSelectAllCompleted={() => {}}
                invoicedRouteIds={invoicedRouteIds}
            />
        </div>
        <div>
            <ClientsTable clients={clients} onViewAll={() => setActiveNav('Clients')} />
        </div>
        </div>
    );
};


const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onLogout, role }) => {
  const { t } = useTranslation();
  const { currentUser, organizationId } = useAuth();

  // Check if demo mode (demo@example.com)
  const isDemoMode = currentUser?.email === 'demo@example.com';

  // Use Firestore hooks for real data (only if not demo mode)
  const { data: firestoreDrivers, loading: driversLoading } = useDrivers(isDemoMode ? null : organizationId);
  const { data: firestoreVehicles, loading: vehiclesLoading } = useVehicles(isDemoMode ? null : organizationId);
  const { data: firestoreRoutes, loading: routesLoading } = useRoutes(isDemoMode ? null : organizationId);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [selectedItem, setSelectedItem] = useState<Route | Driver | Vehicle | Invoice | Client | PayrollRun | Payslip | null>(null);

  // State for demo mode mock data
  const [mockRoutes, setMockRoutes] = useState<Route[]>([]);
  const [mockDrivers, setMockDrivers] = useState<Driver[]>([]);
  const [mockVehicles, setMockVehicles] = useState<Vehicle[]>([]);
  const [mockClients, setMockClients] = useState<Client[]>([]);
  const [mockInvoices, setMockInvoices] = useState<Invoice[]>([]);
  const [mockPayrollRuns, setMockPayrollRuns] = useState<PayrollRun[]>([]);

  // Use appropriate data source based on mode
  const routes = isDemoMode ? mockRoutes : (firestoreRoutes || []);
  const drivers = isDemoMode ? mockDrivers : (firestoreDrivers || []);
  const vehicles = isDemoMode ? mockVehicles : (firestoreVehicles || []);

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [routeStatusFilter, setRouteStatusFilter] = useState<RouteStatusFilter>('All');
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [invoiceView, setInvoiceView] = useState<InvoiceView>('list');
  const [invoiceForPdf, setInvoiceForPdf] = useState<Invoice | null>(null);
  const [invoicedRouteIds, setInvoicedRouteIds] = useState<Set<string>>(new Set());
  const [viewingRoute, setViewingRoute] = useState<Route | null>(null);
  const [viewingPayrollRun, setViewingPayrollRun] = useState<PayrollRun | null>(null);
  
  // Data Fetching State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payroll Filter State
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<PayrollRun['status'] | 'All'>('All');
  const [payrollDateFilter, setPayrollDateFilter] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  // Analytics State
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [dateRange, setDateRange] = useState({ start: lastMonth, end: today });
  const [analyticsDriver1, setAnalyticsDriver1] = useState<string>('all');
  const [analyticsDriver2, setAnalyticsDriver2] = useState<string>('none');

  // Only load data once when demo mode changes
  useEffect(() => {
    const loadAllData = async () => {
        // Only load mock data if in demo mode
        if (!isDemoMode) {
            // For production mode, just load clients, invoices, notifications, payroll
            try {
                setLoading(true);
                setError(null);
                const [
                    clientsData,
                    invoicesData,
                    notificationsData,
                    payrollData,
                ] = await Promise.all([
                    getClients(),
                    getInvoices(),
                    getNotifications(),
                    getPayrollRuns(),
                ]);

                setClients(clientsData as Client[]);
                setInvoices(invoicesData as Invoice[]);
                setNotifications(notificationsData as Notification[]);
                setPayrollRuns(payrollData as PayrollRun[]);
            } catch (err) {
                setError("Failed to load partner data. Please refresh the page.");
                console.error(err);
            } finally {
                setLoading(false);
            }
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
            setClients(clientsData as Client[]);
            setInvoices(invoicesData as Invoice[]);
            setNotifications(notificationsData as Notification[]);
            setPayrollRuns(payrollData as PayrollRun[]);
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
  
  const analyticsData = useMemo(() => {
    return rawPerformanceData.filter(d => {
      const recordDate = new Date(d.date);
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }, [dateRange]);
    
    useEffect(() => {
        if (invoiceForPdf) {
            // Delay to allow the off-screen component to render
            setTimeout(() => {
                const input = document.getElementById('pdf-invoice-preview');
                if (input) {
                    html2canvas(input, { scale: 2 })
                        .then((canvas) => {
                            const imgData = canvas.toDataURL('image/png');
                            const pdf = new jsPDF('p', 'mm', 'a4');
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                            pdf.save(`Invoice-${invoiceForPdf.id}.pdf`);
                        })
                        .finally(() => {
                            setInvoiceForPdf(null); // Clean up after download
                        });
                } else {
                    console.error("PDF preview element not found.");
                    setInvoiceForPdf(null);
                }
            }, 100);
        }
    }, [invoiceForPdf]);

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
  
  const handleCompleteRoute = (route: Route) => {
    if (isDemoMode) {
      setMockRoutes(prev => prev.map(r => r.id === route.id ? { ...r, status: 'Completed', progress: 100 } : r));
      const vehicle = vehicles.find(v => v.plateNumber === route.vehicle);
      if (vehicle && route.distanceKm) {
        setMockVehicles(prev => prev.map(v =>
            v.id === vehicle.id ? { ...v, odometer: v.odometer + route.distanceKm } : v
        ));
      }
    }
    // For production mode, update would happen through Firestore
  };

  const handleAssignDriver = (routeId: string, driverId: string | number, vehicleId: string) => {
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
              // TODO: Implement Firestore route assignment update
              console.log('Assign driver to route in Firestore:', { routeId, driverId, vehicleId });
          }
      }
      setActiveModal(null);
  };
  
  const handleAddExpense = (routeId: string, newExpense: Expense) => {
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
    }
    // For production mode, update would happen through Firestore

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

  const handleDriverAction = (action: 'sendFunds' | 'driverDetails' | 'confirmRemoval' | 'editDriverPay', driver: Driver) => {
    setSelectedItem(driver);
    setActiveModal(action);
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

  const handleUpdateDriverPay = (driverId: number, newPayInfo: { baseSalary: number, pensionContributionRate: number, nhfContributionRate: number }) => {
    if (isDemoMode) {
      setMockDrivers(prev => prev.map(d => d.id === driverId ? { ...d, ...newPayInfo } : d));
    }
    // For production mode, update happens through Firestore
    setActiveModal(null);
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

  const handleSaveInvoice = (invoice: Invoice) => {
    const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
    if (existingIndex > -1) {
        const updatedInvoices = [...invoices];
        updatedInvoices[existingIndex] = invoice;
        setInvoices(updatedInvoices);
    } else {
        setInvoices(prev => [invoice, ...prev]);
    }
    setInvoiceView('list');
    setActiveNav('Invoices');
    setSelectedItem(null);
    setSelectedRoutes([]);
  };
    
  const handleMarkAsPaid = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv));
  };
  
  const handleRequestMarkAsPaid = (invoiceId: string) => {
      const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
      if (invoiceToUpdate) {
        setSelectedItem(invoiceToUpdate);
        setActiveModal('confirmMarkAsPaid');
      }
  };
  
  const handleDeleteInvoice = (invoiceId: string) => {
      if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      }
  };

  const handleDownloadPdf = (invoice: Invoice) => {
      setInvoiceForPdf(invoice);
  };
  
  const handleAddClient = (newClientData: Omit<Client, 'id' | 'status'>) => {
    const newClient: Client = {
      id: `C${Date.now()}`,
      ...newClientData,
      status: 'Active'
    };
    setClients(prev => [newClient, ...prev]);
    setActiveModal(null);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setActiveModal(null);
  };

  const handleDeleteClient = (clientId: string) => {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setActiveModal(null);
  };

  const handleToggleClientStatus = (client: Client) => {
      const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
      setActiveModal(null);
  };

  const handleUpdateNotification = (id: number, updates: Partial<Notification>) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
  };

  const handleDeleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleReadAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleCreatePayrollRun = async (periodStart: string, periodEnd: string) => {
    const newPayslips = await calculatePayslipsForPeriod(drivers, periodStart, periodEnd);
    const newRun: PayrollRun = {
        id: `PR-${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
        periodStart,
        periodEnd,
        payDate: new Date(new Date(periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days after period end
        status: 'Draft',
        payslips: newPayslips,
    };
    setPayrollRuns(prev => [newRun, ...prev]);
    setActiveModal(null);
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
        return <AddVehicleModal onClose={() => setActiveModal(null)} />;
      case 'addDriver':
        return <AddDriverModal onClose={() => setActiveModal(null)} />;
      case 'createRoute':
        return <CreateRouteModal onClose={() => setActiveModal(null)} onAddRoute={handleCreateRoute} />;
      case 'addClient':
        return <AddClientModal onClose={() => setActiveModal(null)} onAddClient={handleAddClient} />;
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
      case 'sendFunds':
        return <SendFundsModal onClose={() => setActiveModal(null)} driver={selectedItem as Driver} />;
      case 'driverDetails':
        return <DriverDetailsModal onClose={() => setActiveModal(null)} driver={selectedItem as Driver} />;
      case 'confirmRemoval':
        return <ConfirmRemovalModal onClose={() => setActiveModal(null)} driver={selectedItem as Driver} onConfirm={handleRemoveDriver} />;
      case 'updateVehicleStatus':
        return <UpdateVehicleStatusModal vehicle={selectedItem as Vehicle} onClose={() => setActiveModal(null)} onSave={(vehicleId, newStatus) => { setVehicles(prev => prev.map(v => v.id === vehicleId ? {...v, status: newStatus} : v)); setActiveModal(null); }} />;
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
        return <CreatePayrollRunModal onClose={() => setActiveModal(null)} onConfirm={handleCreatePayrollRun} />;
      case 'editDriverPay':
        return <EditDriverPayModal driver={selectedItem as Driver} onClose={() => setActiveModal(null)} onSave={handleUpdateDriverPay} />;
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
        return <DashboardView setActiveNav={setActiveNav} setActiveModal={setActiveModal} routes={filteredRoutes} drivers={drivers} vehicles={vehicles} clients={clients.slice(0, 3)} onAssignRoute={handleOpenAssignModal} onViewDetails={handleViewDetails} onCompleteRoute={handleCompleteRoute} onFilterChange={setRouteStatusFilter} activeFilter={routeStatusFilter} onViewPendingRoutes={handleViewPendingRoutes} invoicedRouteIds={invoicedRouteIds} />;
      case 'Map':
        return <MapScreen items={drivers} />;
      case 'Drivers':
        return <DriversScreen setActiveModal={(modal) => handleShowModal(modal)} drivers={drivers} onSendFunds={(driver) => handleDriverAction('sendFunds', driver)} onViewDetails={(driver) => handleDriverAction('driverDetails', driver)} onRemove={(driver) => handleDriverAction('confirmRemoval', driver)} onEditPay={(driver) => handleDriverAction('editDriverPay', driver)} analyticsData={analyticsData} dateRange={dateRange} selectedDriver1={analyticsDriver1} onDriver1Change={setAnalyticsDriver1} selectedDriver2={analyticsDriver2} onDriver2Change={setAnalyticsDriver2} />;
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
        return <RoutesScreen setActiveModal={(modal) => handleShowModal(modal)} routes={filteredRoutes} onAssign={handleOpenAssignModal} onViewDetails={handleViewDetails} onComplete={handleCompleteRoute} onFilterChange={setRouteStatusFilter} activeFilter={routeStatusFilter} selectedRoutes={selectedRoutes} onSelectRoute={handleSelectRoute} onSelectAllCompleted={handleSelectAllCompletedRoutes} onCreateInvoiceFromSelection={handleCreateInvoiceFromSelection} invoicedRouteIds={invoicedRouteIds} />;
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
        return <PartnerAnalyticsScreen 
            drivers={drivers}
            routes={routes}
            vehicles={vehicles}
            clients={clients}
            invoices={invoices}
            payrollRuns={payrollRuns}
        />;
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
            statusFilter={payrollStatusFilter}
            onStatusFilterChange={setPayrollStatusFilter}
            dateFilter={payrollDateFilter}
            onDateFilterChange={setPayrollDateFilter}
        />;
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
        return <div className="bg-white p-6 rounded-xl shadow-sm"><h2>Settings</h2><p>Settings page placeholder.</p></div>;
      case 'Manage Subscription':
        return <ManageSubscriptionScreen onBack={() => setActiveNav('Dashboard')} />;
      default:
        return <DashboardView setActiveNav={setActiveNav} setActiveModal={setActiveModal} routes={filteredRoutes} drivers={drivers} vehicles={vehicles} clients={clients.slice(0,3)} onAssignRoute={handleOpenAssignModal} onViewDetails={handleViewDetails} onCompleteRoute={handleCompleteRoute} onFilterChange={setRouteStatusFilter} activeFilter={routeStatusFilter} onViewPendingRoutes={handleViewPendingRoutes} invoicedRouteIds={invoicedRouteIds} />;
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
    >
      {renderModal()}
      {/* For PDF Generation */}
      {invoiceForPdf && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}>
              <div id="pdf-invoice-preview">
                 <InvoicePreview invoice={invoiceForPdf} />
              </div>
          </div>
      )}
      {renderContent()}
    </DashboardLayout>
  );
};

export default PartnerDashboard;
