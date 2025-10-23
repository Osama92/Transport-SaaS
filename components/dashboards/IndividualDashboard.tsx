import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../DashboardLayout';
import StatCard from '../StatCard';
import { TruckIcon, CubeTransparentIcon, CheckCircleIcon, PlusIcon, ClipboardDocumentCheckIcon, DocumentTextIcon } from '../Icons';
import DeliveryProgress from '../DeliveryProgress';
import ShipmentsTable from '../ShipmentHistoryTable';
import AllNotificationsScreen from '../screens/AllNotificationsScreen';
import CreateShipmentScreen from '../screens/CreateShipmentScreen';
import TransportersScreen from '../screens/TransportersScreen';
import MapScreen from '../screens/MapScreen'; // Import MapScreen
import AnalyticsScreen from '../screens/AnalyticsScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import DeliveryContactsScreen from '../screens/DeliveryContactsScreen';
// FIX: Update import path from firebase/firestore to firebase/config
import { getTransporters, getShipments, getDeliveryContacts, getNotifications, getMaterials } from '../../firebase/config';
import type { Notification, Shipment, DeliveryStop, Transporter, TrackingEvent, DeliveryContact, Material } from '../../types';
import ModalBase from '../modals/ModalBase';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import AddTransporterModal from '../modals/AddTransporterModal';
import EditTransporterModal from '../modals/EditTransporterModal';
import WaybillModal from '../modals/WaybillModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useFirestore';
import { markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../../services/firestore/notifications';

// --- MODAL COMPONENTS (Scoped to this dashboard) ---

const InfoRow: React.FC<{label: string, value: string | React.ReactNode}> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-right">{value}</span>
    </div>
);

const ShipmentDetailsModal: React.FC<{
    shipment: Shipment | null, 
    onClose: () => void,
    onUpdateStopStatus: (shipmentId: string, stopId: string, newStatus: DeliveryStop['status']) => void,
    onSharePod: (shipmentId: string) => void,
    onGenerateWaybill: (shipment: Shipment, stop: DeliveryStop) => void,
}> = ({ shipment, onClose, onUpdateStopStatus, onSharePod, onGenerateWaybill }) => {
    const { t } = useTranslation();
    if (!shipment) return null;

    const hasSharedPod = shipment.trackingHistory?.some(e => e.title === 'POD Shared');

    return (
        <ModalBase title={t('modals.shipmentDetails.title', {id: shipment.id})} onClose={onClose}>
            <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <InfoRow label={t('modals.shipmentDetails.origin')} value={shipment.origin} />
                    <InfoRow label={t('modals.shipmentDetails.dateCreated')} value={shipment.date} />
                    <InfoRow label={t('modals.shipmentDetails.status')} value={shipment.status} />
                    <InfoRow label={t('modals.shipmentDetails.transporter')} value={shipment.transporterId ? t('modals.shipmentDetails.assignedTo', {id: shipment.transporterId}) : t('modals.shipmentDetails.notAssigned')} />
                </div>
                <div>
                    <h4 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-2">{t('modals.shipmentDetails.stopsTitle', {count: shipment.stops.length})}</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {shipment.stops.map(stop => (
                            <div key={stop.id} className="p-3 bg-gray-100 dark:bg-slate-700 rounded-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{stop.itemName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">To: {stop.recipientName} at {stop.destination}</p>
                                    </div>
                                    <button 
                                        onClick={() => onGenerateWaybill(shipment, stop)}
                                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                        <DocumentTextIcon className="w-4 h-4"/> Waybill
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {stop.quantity} {stop.uom}</p>
                                    <select 
                                        value={stop.status} 
                                        onChange={(e) => onUpdateStopStatus(shipment.id, stop.id, e.target.value as DeliveryStop['status'])}
                                        disabled={shipment.status === 'Completed' || shipment.status === 'Pending' || shipment.status === 'Assigned to Transporter'}
                                        className="text-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 disabled:opacity-50"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Failed">Failed</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4">
                    {shipment.status === 'Completed' && (
                        <button 
                            type="button" 
                            onClick={() => onSharePod(shipment.id)} 
                            disabled={hasSharedPod}
                            className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-2 px-4 rounded-lg text-sm dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ClipboardDocumentCheckIcon className="w-4 h-4"/>
                            {hasSharedPod ? 'POD Shared' : 'Share POD'}
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg ml-auto">{t('common.close')}</button>
                </div>
            </div>
        </ModalBase>
    );
};

const AssignTransporterModal: React.FC<{shipment: Shipment | null, transporters: Transporter[], onClose: () => void, onAssign: (shipmentId: string, transporterId: string) => void}> = ({ shipment, transporters, onClose, onAssign }) => {
    const { t } = useTranslation();
    const [selectedTransporter, setSelectedTransporter] = useState('');
    if (!shipment) return null;
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTransporter) {
            onAssign(shipment.id, selectedTransporter);
        } else {
            alert("Please select a transporter.");
        }
    };
    return (
        <ModalBase title={t('modals.assignTransporter.title', {id: shipment.id})} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('modals.assignTransporter.subtitle')}</p>
                <div>
                    <label htmlFor="transporter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.assignTransporter.label')}</label>
                    <select id="transporter" value={selectedTransporter} onChange={e => setSelectedTransporter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                        <option value="">{t('modals.assignTransporter.placeholder')}</option>
                        {transporters.filter(t => t.status === 'Active').map(transporter => <option key={transporter.id} value={transporter.id}>{transporter.name} ({t('modals.assignTransporter.rating', {rating: transporter.rating})})</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg" disabled={!selectedTransporter}>{t('modals.assignTransporter.assignButton')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

// --- MAIN COMPONENT ---

interface IndividualDashboardProps {
  onLogout: () => void;
  role: string;
  onSubscribeClick?: () => void;
}

type IndividualView = 'dashboard' | 'createShipment' | 'notifications';
type ModalType = 'viewShipment' | 'deleteShipment' | 'assignShipment' | 'addTransporter' | 'editTransporter' | 'confirmDeleteTransporter' | 'confirmToggleTransporterStatus' | 'generateWaybill' | null;

const IndividualDashboard: React.FC<IndividualDashboardProps> = ({ onLogout, role, onSubscribeClick }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [view, setView] = useState<IndividualView>('dashboard');
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [dateRange, setDateRange] = useState({ start: lastMonth, end: today });

  // Check if demo mode
  const isDemoMode = currentUser?.email === 'demo@example.com';

  // Use Firestore hook for notifications (only if not demo mode)
  const { data: firestoreNotifications } = useNotifications(isDemoMode ? null : currentUser?.uid || null);
  const [mockNotifications, setMockNotifications] = useState<Notification[]>([]);
  const notifications = isDemoMode ? mockNotifications : (firestoreNotifications || []);
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [deliveryContacts, setDeliveryContacts] = useState<DeliveryContact[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Shipment | Transporter | { shipment: Shipment, stop: DeliveryStop } | null>(null);
  const [trackedShipment, setTrackedShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  useEffect(() => {
    const loadAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [
                transportersData,
                shipmentsData,
                contactsData,
                notificationsData,
                materialsData,
            ] = await Promise.all([
                getTransporters(),
                getShipments(),
                getDeliveryContacts(),
                getNotifications(),
                getMaterials(),
            ]);

            const shipmentsTyped = shipmentsData as Shipment[];
            setTransporters(transportersData as Transporter[]);
            setShipments(shipmentsTyped);
            setDeliveryContacts(contactsData as DeliveryContact[]);
            // Only set mock notifications in demo mode
            if (isDemoMode) {
              setMockNotifications(notificationsData.slice(0, 5) as Notification[]); // Smaller subset
            }
            setMaterials(materialsData as Material[]);

            setTrackedShipment(shipmentsTyped.find(s => s.status === 'In Transit') || shipmentsTyped[0] || null);

        } catch (err) {
            setError("Failed to load dashboard data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    loadAllData();
  }, [isDemoMode]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(shipment => {
        const matchesSearch = shipment.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(shipment.status);
        return matchesSearch && matchesStatus;
    });
  }, [shipments, searchQuery, statusFilters]);

  const trackedTransporter = useMemo(() => {
    if (!trackedShipment?.transporterId) return null;
    return transporters.find(t => t.id === trackedShipment.transporterId) || null;
  }, [trackedShipment, transporters]);
  
  const addTrackingEvent = (history: TrackingEvent[] | undefined, title: string, subtitle: string): TrackingEvent[] => {
    const newEvent: TrackingEvent = {
        title,
        subtitle,
        timestamp: new Date().toISOString(),
        status: 'active', // The newest event is always active
    };
    // Mark all previous events as completed
    const existingHistory = (history || []).map(event => ({ ...event, status: 'completed' as const }));
    return [...existingHistory, newEvent];
  };

  const handleUpdateNotification = async (id: number | string, updates: Partial<Notification>) => {
    if (isDemoMode) {
      setMockNotifications(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
    } else {
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
      setMockNotifications(prev => prev.filter(n => n.id !== id));
    } else {
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
      setMockNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      if (currentUser) {
        try {
          await markAllNotificationsAsRead(currentUser.uid);
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
        }
      }
    }
  };

  const handleOpenProfileSettings = () => {
    console.log("Profile settings clicked");
  };
  
  const handleCreateShipment = (newStops: Omit<DeliveryStop, 'id' | 'status'>[]) => {
    const newShipment: Shipment = {
        id: `#SHIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        origin: 'My Location', // Default origin
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        status: 'Pending',
        cost: 25000 + Math.random() * 50000, // Mock cost
        stops: newStops.map((stop, index) => ({
            ...stop,
            id: `STOP-${Date.now()}-${index}`,
            status: 'Pending',
        })),
        trackingHistory: addTrackingEvent([], 'Shipment Created', `Shipment with ${newStops.length} stop(s) created.`),
    };
    setShipments(prev => [newShipment, ...prev]);
    setView('dashboard');
  };

  const handleShowModal = (modalType: ModalType, item: Shipment | Transporter) => {
    setSelectedItem(item);
    setActiveModal(modalType);
  };
  
  const handleShowWaybillModal = (shipment: Shipment, stop: DeliveryStop) => {
    setSelectedItem({ shipment, stop });
    setActiveModal('generateWaybill');
  };

  const handleDeleteShipment = () => {
    if (selectedItem && 'stops' in selectedItem) { // Type guard for Shipment
      setShipments(prev => prev.filter(s => s.id !== selectedItem.id));
    }
    setActiveModal(null);
  };

  const handleAssignTransporter = (shipmentId: string, transporterId: string) => {
    const transporter = transporters.find(t => t.id === transporterId);
    if (!transporter) return;

    setShipments(prev => prev.map(s => {
      if (s.id === shipmentId) {
        let history = addTrackingEvent(s.trackingHistory, 'Assigned to Transporter', `Assigned to ${transporter.name}`);
        const updatedShipment = { 
            ...s, 
            transporterId: transporterId, 
            status: 'Assigned to Transporter' as const,
            trackingHistory: history 
        };
        // Update tracked shipment if it's the one being assigned
        if (trackedShipment?.id === shipmentId) {
            setTrackedShipment(updatedShipment);
        }
        return updatedShipment;
      }
      return s;
    }));
    setActiveModal(null);
  };

  const handleUpdateStopStatus = (shipmentId: string, stopId: string, newStatus: DeliveryStop['status']) => {
    setShipments(prevShipments => {
        const newShipments = [...prevShipments];
        const shipmentIndex = newShipments.findIndex(s => s.id === shipmentId);
        if (shipmentIndex === -1) return prevShipments;

        const shipmentToUpdate = { ...newShipments[shipmentIndex] };
        
        const stopIndex = shipmentToUpdate.stops.findIndex(st => st.id === stopId);
        if (stopIndex === -1) return prevShipments;

        // Update stop status
        shipmentToUpdate.stops = [...shipmentToUpdate.stops];
        shipmentToUpdate.stops[stopIndex] = { ...shipmentToUpdate.stops[stopIndex], status: newStatus };

        // Add tracking event
        shipmentToUpdate.trackingHistory = addTrackingEvent(
            shipmentToUpdate.trackingHistory,
            `Stop #${stopIndex + 1} ${newStatus}`,
            `${shipmentToUpdate.stops[stopIndex].itemName} to ${shipmentToUpdate.stops[stopIndex].recipientName}`
        );

        const allDelivered = shipmentToUpdate.stops.every(s => s.status === 'Delivered');
        if (allDelivered) {
            shipmentToUpdate.status = 'Completed';
            shipmentToUpdate.completedTimestamp = new Date().toISOString();
            shipmentToUpdate.trackingHistory = addTrackingEvent(
                shipmentToUpdate.trackingHistory,
                'Shipment Delivered',
                'All stops have been successfully delivered.'
            );
        } else {
             const someDelivered = shipmentToUpdate.stops.some(s => s.status === 'Delivered');
             if (someDelivered && shipmentToUpdate.status !== 'Completed') {
                 shipmentToUpdate.status = 'Partially Delivered';
             }
        }
        
        newShipments[shipmentIndex] = shipmentToUpdate;
        
        if (trackedShipment?.id === shipmentId) {
            setTrackedShipment(shipmentToUpdate);
        }

        return newShipments;
    });
  };

  const handleSharePod = (shipmentId: string) => {
    setShipments(prev => {
        const newShipments = prev.map(s => {
            if (s.id === shipmentId) {
                if (s.trackingHistory?.some(e => e.title === 'POD Shared')) {
                    return s; // Avoid adding duplicate event
                }
                const history = addTrackingEvent(s.trackingHistory, 'POD Shared', 'Proof of Delivery has been shared.');
                const updatedShipment = { ...s, trackingHistory: history };
                
                if (trackedShipment?.id === shipmentId) {
                    setTrackedShipment(updatedShipment);
                }
                return updatedShipment;
            }
            return s;
        });
        return newShipments;
    });
    setActiveModal(null);
  };

  const handleTrackShipment = (shipment: Shipment) => {
    setTrackedShipment(shipment);
  };

  // --- Transporter Handlers ---
  const handleAddTransporter = (newTransporterData: Omit<Transporter, 'id' | 'status'>) => {
    const newTransporter: Transporter = {
      id: `T${Date.now()}`,
      ...newTransporterData,
      status: 'Active'
    };
    setTransporters(prev => [newTransporter, ...prev]);
    setActiveModal(null);
  };

  const handleUpdateTransporter = (updatedTransporter: Transporter) => {
    setTransporters(prev => prev.map(t => t.id === updatedTransporter.id ? updatedTransporter : t));
    setActiveModal(null);
  };

  const handleDeleteTransporter = () => {
      if (selectedItem && 'rating' in selectedItem) { // Type guard for Transporter
        setTransporters(prev => prev.filter(t => t.id !== (selectedItem as Transporter).id));
      }
      setActiveModal(null);
  };

  const handleToggleTransporterStatus = () => {
      if (selectedItem && 'rating' in selectedItem) {
          const transporter = selectedItem as Transporter;
          const newStatus = transporter.status === 'Active' ? 'Inactive' : 'Active';
          setTransporters(prev => prev.map(t => t.id === transporter.id ? { ...t, status: newStatus } : t));
      }
      setActiveModal(null);
  };
  
  // --- Materials Handlers ---
  const handleAddMaterial = (newMaterialData: Omit<Material, 'id'>) => {
    const newMaterial: Material = {
        id: `MAT-${Date.now()}`,
        ...newMaterialData
    };
    setMaterials(prev => [newMaterial, ...prev]);
  };
  
  // --- Delivery Contact Handlers ---
    const handleAddContact = (newContactData: Omit<DeliveryContact, 'id'>) => {
        const newContact: DeliveryContact = {
            id: `DC-${Date.now()}`,
            ...newContactData
        };
        setDeliveryContacts(prev => [newContact, ...prev]);
    };


  const renderModal = () => {
    const item = selectedItem;
    switch (activeModal) {
      case 'viewShipment':
        return <ShipmentDetailsModal 
            shipment={item as Shipment} 
            onClose={() => setActiveModal(null)} 
            onUpdateStopStatus={handleUpdateStopStatus}
            onSharePod={handleSharePod}
            onGenerateWaybill={handleShowWaybillModal}
        />;
      case 'deleteShipment':
        return <ConfirmActionModal
          onClose={() => setActiveModal(null)}
          onConfirm={handleDeleteShipment}
          title={t('modals.deleteShipment.title')}
          message={t('modals.deleteShipment.message', { id: (item as Shipment)?.id })}
          confirmButtonText={t('modals.deleteShipment.deleteButton')}
          isDestructive={true}
        />;
      case 'assignShipment':
        return <AssignTransporterModal shipment={item as Shipment} transporters={transporters} onClose={() => setActiveModal(null)} onAssign={handleAssignTransporter} />;
      
      case 'addTransporter':
        return <AddTransporterModal onClose={() => setActiveModal(null)} onAdd={handleAddTransporter} />;
      case 'editTransporter':
        return <EditTransporterModal client={item as Transporter} onClose={() => setActiveModal(null)} onSave={handleUpdateTransporter} />;
      case 'confirmDeleteTransporter':
        const transporterToDelete = item as Transporter;
        return <ConfirmActionModal 
            onClose={() => setActiveModal(null)}
            onConfirm={handleDeleteTransporter}
            title={t('modals.deleteTransporter.title')}
            message={t('modals.deleteTransporter.message', { name: transporterToDelete.name })}
            confirmButtonText={t('common.remove')}
            isDestructive={true}
        />;
    case 'confirmToggleTransporterStatus':
        const transporterToToggle = item as Transporter;
        const newStatus = transporterToToggle.status === 'Active' ? 'Inactive' : 'Active';
        return <ConfirmActionModal
            onClose={() => setActiveModal(null)}
            onConfirm={handleToggleTransporterStatus}
            title={t('modals.toggleTransporterStatus.title', { status: newStatus })}
            message={t('modals.toggleTransporterStatus.message', { name: transporterToToggle.name, status: newStatus.toLowerCase() })}
            confirmButtonText={t('modals.toggleTransporterStatus.button', { status: newStatus })}
        />;
    case 'generateWaybill':
        const { shipment, stop } = item as { shipment: Shipment, stop: DeliveryStop };
        return <WaybillModal 
            shipment={shipment} 
            stop={stop} 
            onClose={() => setActiveModal(null)} 
        />;
      default:
        return null;
    }
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

    if (activeNav === 'Analytics') {
      return <AnalyticsScreen shipments={shipments} transporters={transporters} />;
    }
    
    if (activeNav === 'Materials') {
        return <MaterialsScreen materials={materials} onAddMaterial={handleAddMaterial} />;
    }
    
    if (activeNav === 'Contacts') {
        return <DeliveryContactsScreen contacts={deliveryContacts} onAddContact={handleAddContact} />;
    }

    if (activeNav === 'Map') {
        return <MapScreen items={transporters} />;
    }

    if (activeNav === 'Transporters') {
        return <TransportersScreen 
            transporters={transporters}
            isLoading={loading}
            error={error}
            onAdd={() => setActiveModal('addTransporter')}
            onEdit={(transporter) => handleShowModal('editTransporter', transporter)}
            onDelete={(transporter) => handleShowModal('confirmDeleteTransporter', transporter)}
            onToggleStatus={(transporter) => handleShowModal('confirmToggleTransporterStatus', transporter)}
        />
    }
    
    if (view === 'createShipment') {
        return <CreateShipmentScreen onBack={() => setView('dashboard')} onCreateShipment={handleCreateShipment} deliveryContacts={deliveryContacts} materials={materials} />;
    }
    
    // Default to Dashboard view
    return (
      <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div></div>
            <button
                onClick={() => setView('createShipment')}
                className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
                <PlusIcon className="w-5 h-5" />
                {t('dashboard.createShipmentButton')}
            </button>
          </div>
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title={t('dashboard.individual_stat_total_shipments_title')}
              value={shipments.length.toString()}
              change="+2"
              changeType="increase"
              description={t('dashboard.individual_stat_total_shipments_desc')}
              icon={<TruckIcon className="w-8 h-8 text-green-500" />}
              iconBg="bg-green-100"
            />
            <StatCard
              title={t('dashboard.individual_stat_in_transit_title')}
              value={shipments.filter(s => s.status === 'In Transit' || s.status === 'Partially Delivered').length.toString()}
              change="+1"
              changeType="increase"
              description={t('dashboard.individual_stat_in_transit_desc')}
              icon={<CubeTransparentIcon className="w-8 h-8 text-blue-500" />}
              iconBg="bg-blue-100"
            />
            <StatCard
              title={t('dashboard.individual_stat_delivered_title')}
              value={shipments.filter(s => s.status === 'Completed').length.toString()}
              change="+5"
              changeType="increase"
              description={t('dashboard.individual_stat_delivered_desc')}
              icon={<CheckCircleIcon className="w-8 h-8 text-purple-500" />}
              iconBg="bg-purple-100"
            />
          </div>

          {/* Main Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                  {loading ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full flex justify-center items-center min-h-[400px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full flex justify-center items-center min-h-[400px]">
                            <div className="text-center text-red-500">
                                <p className="font-bold">Error</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    ) : (
                        <ShipmentsTable 
                            shipments={filteredShipments}
                            onView={(shipment) => handleShowModal('viewShipment', shipment)}
                            onDelete={(shipment) => handleShowModal('deleteShipment', shipment)}
                            onAssign={(shipment) => handleShowModal('assignShipment', shipment)}
                            onTrack={handleTrackShipment}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            statusFilters={statusFilters}
                            onStatusFilterChange={setStatusFilters}
                        />
                    )}
              </div>
              <div className="lg:col-span-1">
                  <DeliveryProgress shipment={trackedShipment} transporter={trackedTransporter} />
              </div>
          </div>
        </div>
    );
  }

  return (
    <DashboardLayout
      onLogout={onLogout}
      role={role}
      activeNav={activeNav}
      onNavChange={(nav) => { setView('dashboard'); setActiveNav(nav); }}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onOpenProfileSettings={handleOpenProfileSettings}
      notifications={notifications}
      onSubscribeClick={onSubscribeClick}
    >
      {renderModal()}
      {renderContent()}
    </DashboardLayout>
  );
};

export default IndividualDashboard;