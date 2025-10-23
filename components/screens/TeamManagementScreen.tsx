import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDrivers } from '../../hooks/useFirestore';
import { updateDriver } from '../../services/firestore/drivers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Driver } from '../../types';
import SetDriverCredentialsModal from '../modals/SetDriverCredentialsModal';
import {
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    TrashIcon,
    PencilIcon,
    UserIcon,
    BellIcon
} from '../Icons';

interface TeamManagementScreenProps {
    onBack: () => void;
}

const TeamManagementScreen: React.FC<TeamManagementScreenProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { organizationId, organization } = useAuth();
    const { data: drivers, loading } = useDrivers(organizationId);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    const handleSetCredentials = async (driverId: string, username: string, password: string) => {
        try {
            // Call Cloud Function to create driver auth without affecting admin session
            const functions = getFunctions();
            const createDriverAuth = httpsCallable(functions, 'createDriverAuth');

            const result = await createDriverAuth({
                driverId,
                username,
                password,
                organizationId
            });

            console.log('[TEAM_MGMT] Driver credentials created:', result.data);

            alert(`Driver account created successfully!\n\nUsername: ${username}\nPassword: ${password}\n\nShare these with the driver. They can login at /driver-portal`);

            // Close modal
            setShowCredentialsModal(false);
            setSelectedDriver(null);
        } catch (error: any) {
            console.error('[TEAM_MGMT] Error creating driver credentials:', error);

            let errorMessage = 'Failed to create driver credentials. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }

            alert(`Error: ${errorMessage}`);
        }
    };

    const handleResetDriverStatus = async (driver: Driver) => {
        if (confirm(`Reset status for ${driver.name}?\n\nThis will:\n• Set status to "Idle"\n• Clear current route assignment\n\nThis is useful if a driver is stuck in "On-route" status.`)) {
            try {
                await updateDriver(driver.id, {
                    status: 'Idle',
                    currentRouteId: undefined,
                    currentRouteStatus: undefined
                });
                alert('Driver status reset successfully!');
            } catch (error) {
                console.error('Error resetting driver status:', error);
                alert('Failed to reset driver status. Please try again.');
            }
        }
    };

    // Filter drivers
    const filteredDrivers = useMemo(() => {
        return drivers.filter(driver => {
            const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                driver.phone.includes(searchTerm);
            const matchesStatus = statusFilter === 'All' || driver.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [drivers, searchTerm, statusFilter]);

    // Check subscription limits
    const subscriptionDriverLimit = organization?.subscription?.limits?.drivers;
    const canAddMoreDrivers = subscriptionDriverLimit === undefined || subscriptionDriverLimit === -1
        ? true
        : drivers.length < subscriptionDriverLimit;

    const driverLimit = subscriptionDriverLimit === undefined || subscriptionDriverLimit === -1
        ? 'Unlimited'
        : subscriptionDriverLimit;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Team Management</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Manage credentials • {drivers.length}/{driverLimit} drivers
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowInviteModal(true)}
                        disabled={!canAddMoreDrivers}
                        className="flex items-center gap-1 md:gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors text-xs md:text-sm whitespace-nowrap"
                    >
                        <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden xs:inline">Invite Driver</span>
                        <span className="xs:hidden">Invite</span>
                    </button>
                </div>

                {!canAddMoreDrivers && (
                    <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ You've reached your driver limit ({driverLimit}). Upgrade your plan to add more drivers.
                        </p>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[300px]">
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Drivers Table */}
            <div className="p-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading drivers...</p>
                        </div>
                    ) : filteredDrivers.length === 0 ? (
                        <div className="p-8 text-center">
                            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No drivers found</p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Driver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">WhatsApp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {filteredDrivers.map((driver) => (
                                    <DriverRow
                                        key={driver.id}
                                        driver={driver}
                                        onSetCredentials={() => {
                                            setSelectedDriver(driver);
                                            setShowCredentialsModal(true);
                                        }}
                                        onResetStatus={() => handleResetDriverStatus(driver)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Info Panel */}
            <div className="px-6 pb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📱 WhatsApp Notifications</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Drivers with valid phone numbers will receive WhatsApp notifications when:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4">
                        <li>• New routes are assigned to them</li>
                        <li>• Payments are credited to their wallet</li>
                        <li>• Vehicle maintenance is due</li>
                        <li>• Emergency alerts are sent</li>
                    </ul>
                </div>
            </div>

            {/* Credentials Modal */}
            {showCredentialsModal && selectedDriver && (
                <SetDriverCredentialsModal
                    driver={selectedDriver}
                    onClose={() => {
                        setShowCredentialsModal(false);
                        setSelectedDriver(null);
                    }}
                    onSave={handleSetCredentials}
                />
            )}
        </div>
    );
};

// Driver Row Component
const DriverRow: React.FC<{
    driver: Driver;
    onSetCredentials: () => void;
    onResetStatus: () => void;
}> = ({ driver, onSetCredentials, onResetStatus }) => {
    const [showActions, setShowActions] = useState(false);

    // Check if phone is WhatsApp capable (basic validation)
    const hasWhatsApp = driver.phone && driver.phone.length >= 10;

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <img
                        src={driver.photo || `https://ui-avatars.com/api/?name=${driver.name}&background=3b82f6&color=fff`}
                        alt={driver.name}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{driver.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{driver.licenseNumber}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{driver.phone}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {driver.username || 'Not set'}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4">
                {hasWhatsApp ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="text-xs">Enabled</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                        <XCircleIcon className="w-4 h-4" />
                        <span className="text-xs">No phone</span>
                    </div>
                )}
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    driver.status === 'Active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                    {driver.status}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSetCredentials}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Edit credentials"
                    >
                        <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {(driver.status === 'On-route' || driver.currentRouteId) && (
                        <button
                            onClick={onResetStatus}
                            className="p-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded transition-colors"
                            title="Reset driver status (clear stuck route)"
                        >
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                    <button
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Revoke access"
                    >
                        <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default TeamManagementScreen;
