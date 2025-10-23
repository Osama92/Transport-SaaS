import React, { useState } from 'react';
import ModalBase from './ModalBase';
import type { Client } from '../../types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../services/firestore/clients';
import { canAddResource, getSubscriptionLimits } from '../../services/firestore/subscriptions';
import LimitReachedModal from '../LimitReachedModal';

interface AddClientModalProps {
    onClose: () => void;
    onAddClient?: (client: Omit<Client, 'id' | 'status'>) => void;
    currentClientCount?: number;
}

const InputField: React.FC<{label: string, id: string, name: string, type?: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, id, name, type = 'text', placeholder, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={name} placeholder={placeholder} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onAddClient, currentClientCount = 0 }) => {
    const { t } = useTranslation();
    const { currentUser, organizationId, organization, userRole } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        tin: '',
        cacNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const limits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');
    const clientLimit = limits?.clients;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organizationId || !currentUser) {
            setError('You must be logged in to add a client');
            return;
        }

        // Check subscription limit before creating
        if (!canAddResource(currentClientCount, clientLimit)) {
            setShowLimitModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (!formData.name) {
                setError('Company name is required');
                setLoading(false);
                return;
            }

            // Create client in Firestore
            await createClient(
                organizationId,
                {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company: formData.name,
                    address: formData.address,
                    status: 'Active',
                    notes: '',
                    contactPerson: formData.contactPerson,
                    taxId: formData.tin,
                    tin: formData.tin, // Also use tin field
                    cacNumber: formData.cacNumber,
                    paymentTerms: 'Net 30',
                    creditLimit: 0,
                    outstandingBalance: 0,
                    totalRevenue: 0,
                    totalRoutes: 0,
                },
                currentUser.uid
            );

            // Don't call onAddClient callback - it causes duplicate creation
            // The useFirestore hook will automatically update the list

            onClose();
        } catch (err: any) {
            console.error('Error creating client:', err);
            setError(err.message || 'Failed to create client');
            setLoading(false);
        }
    };

    const handleUpgrade = () => {
        setShowLimitModal(false);
        onClose();
    };

    return (
        <>
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceType="clients"
                currentPlan={subscriptionPlan}
                onUpgrade={handleUpgrade}
            />
            <ModalBase title={t('modals.addClient.title')} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                <InputField label={t('modals.addClient.companyName')} id="name" name="name" placeholder="e.g., GlobalTech Inc." value={formData.name} onChange={handleChange} />
                <InputField label={t('modals.addClient.contactPerson')} id="contactPerson" name="contactPerson" placeholder="e.g., Jane Smith" value={formData.contactPerson} onChange={handleChange} />
                <InputField label={t('modals.addClient.email')} id="email" name="email" type="email" placeholder="e.g., contact@globaltech.com" value={formData.email} onChange={handleChange} />
                <InputField label={t('modals.addClient.phone')} id="phone" name="phone" type="tel" placeholder="e.g., (555) 987-6543" value={formData.phone} onChange={handleChange} />
                <InputField label={t('modals.addClient.address')} id="address" name="address" placeholder="e.g., 123 Business Rd, Suite 400" value={formData.address} onChange={handleChange} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label={t('modals.addClient.tin')} id="tin" name="tin" placeholder="e.g., 12345678-0001" value={formData.tin} onChange={handleChange} />
                    <InputField label={t('modals.addClient.cac')} id="cacNumber" name="cacNumber" placeholder="e.g., RC123456" value={formData.cacNumber} onChange={handleChange} />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300 disabled:opacity-50">{t('common.cancel')}</button>
                    <button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : t('modals.addClient.saveButton')}
                    </button>
                </div>
                </form>
            </ModalBase>
        </>
    );
};

export default AddClientModal;