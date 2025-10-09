import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../DashboardLayout';
import StatCard from '../StatCard';
import { TruckIcon, CubeTransparentIcon, CheckCircleIcon, ArchiveBoxIcon } from '../Icons';
import LatestVisits from '../LatestVisits';
import AnalyticView from '../AnalyticView';
import DeliveryProgress from '../DeliveryProgress';
import ProductsTable from '../ProductsTable';
import AllNotificationsScreen from '../screens/AllNotificationsScreen';
import MapScreen from '../screens/MapScreen'; // Import MapScreen
// FIX: Update import path from firebase/firestore to firebase/config
import { getProducts, getVisits, getNotifications } from '../../firebase/config';
import type { Notification, Product, Visit } from '../../types';

interface BusinessDashboardProps {
  onLogout: () => void;
  role: string;
}

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onLogout, role }) => {
  const { t } = useTranslation();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [dateRange, setDateRange] = useState({ start: lastMonth, end: today });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [productsData, visitsData, notificationsData] = await Promise.all([
                getProducts(),
                getVisits(),
                getNotifications(),
            ]);
            setProducts(productsData as Product[]);
            setVisits(visitsData as Visit[]);
            // A subset for this user
            setNotifications(notificationsData.slice(0, 8) as Notification[]);
        } catch (err) {
            setError("Failed to load dashboard data. Please try again later.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);


  const handleUpdateNotification = (id: number, updates: Partial<Notification>) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
  };
  const handleDeleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const handleReadAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleOpenProfileSettings = () => {
    setActiveNav('Settings'); // Or open a modal
  };

  const renderContent = () => {
    if (activeNav === 'Notifications') {
      return (
        <AllNotificationsScreen
          notifications={notifications}
          onUpdateNotification={handleUpdateNotification}
          onDeleteNotification={handleDeleteNotification}
          onReadAll={handleReadAll}
        />
      );
    }

    if (activeNav === 'Map') {
        return <MapScreen items={[]} />;
    }

    if (loading && activeNav === 'Dashboard') {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error && activeNav === 'Dashboard') {
         return (
            <div className="flex h-full items-center justify-center text-center text-red-500">
                <div>
                    <h3 className="text-xl font-bold">Something went wrong</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Default to Dashboard view
    return (
      <div className="flex flex-col gap-8">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={t('dashboard.stat_total_shipments_title')}
              value="1,260"
              change="+12.05%"
              changeType="increase"
              description={t('dashboard.stat_total_shipments_desc')}
              icon={<TruckIcon className="w-8 h-8 text-green-500" />}
              iconBg="bg-green-100"
            />
            <StatCard
              title={t('dashboard.stat_in_transit_title')}
              value="365"
              change="+2.45%"
              changeType="increase"
              description={t('dashboard.stat_in_transit_desc')}
              icon={<CubeTransparentIcon className="w-8 h-8 text-blue-500" />}
              iconBg="bg-blue-100"
            />
            <StatCard
              title={t('dashboard.stat_delivered_title')}
              value="950"
              change="+75.45%"
              changeType="increase"
              description={t('dashboard.stat_delivered_desc')}
              icon={<CheckCircleIcon className="w-8 h-8 text-purple-500" />}
              iconBg="bg-purple-100"
            />
            <StatCard
              title={t('dashboard.stat_pending_pickup_title')}
              value="35"
              change="-24.55%"
              changeType="decrease"
              description={t('dashboard.stat_pending_pickup_desc')}
              icon={<ArchiveBoxIcon className="w-8 h-8 text-orange-500" />}
              iconBg="bg-orange-100"
            />
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LatestVisits visits={visits} />
            </div>
            <div className="lg:col-span-2">
               <AnalyticView />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                  <ProductsTable products={products} />
              </div>
              <div className="lg:col-span-1">
                  <DeliveryProgress shipment={null} />
              </div>
          </div>
        </div>
    )
  }

  return (
    <DashboardLayout 
      onLogout={onLogout} 
      role={role} 
      activeNav={activeNav} 
      onNavChange={setActiveNav}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onOpenProfileSettings={handleOpenProfileSettings}
      notifications={notifications}
    >
        {renderContent()}
    </DashboardLayout>
  );
};

export default BusinessDashboard;