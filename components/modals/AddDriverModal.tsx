import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';
import { createDriver } from '../../services/firestore/drivers';
import { canAddResource, getSubscriptionLimits } from '../../services/firestore/subscriptions';
import LimitReachedModal from '../LimitReachedModal';
import { verifyBankAccount, NIGERIAN_BANKS } from '../../services/bankVerification';
import { uploadDriverPhoto, uploadDriverLicense } from '../../services/firestore/storage';
import { notifyDriverOnboarded } from '../../services/notificationTriggers';

interface AddDriverModalProps {
    onClose: () => void;
    currentDriverCount?: number;
    onUpgradePlan?: () => void; // Callback to navigate to subscription page
}

const InputField: React.FC<{label: string, id: string, type?: string, placeholder: string}> = ({ label, id, type = 'text', placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const AddDriverModal: React.FC<AddDriverModalProps> = ({ onClose, currentDriverCount = 0, onUpgradePlan }) => {
    const { t } = useTranslation();
    const { currentUser, organizationId, organization, userRole } = useAuth();
    const [driverPhoto, setDriverPhoto] = useState<File | null>(null);
    const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [selectedBankCode, setSelectedBankCode] = useState('');

    // Get subscription limits
    const subscriptionPlan = organization?.subscription?.plan || 'basic';
    const limits = getSubscriptionLimits(subscriptionPlan, userRole || 'partner');
    const driverLimit = limits?.drivers;

    const driverPhotoInputRef = useRef<HTMLInputElement>(null);
    const licensePhotoInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    const driverPhotoPreview = driverPhoto ? URL.createObjectURL(driverPhoto) : null;

    const handleVerifyAccount = async () => {
        const accountNumberInput = document.getElementById('accountNumber') as HTMLInputElement;
        const accountNumber = accountNumberInput?.value;

        if (!accountNumber || accountNumber.length !== 10) {
            setError('Please enter a valid 10-digit account number');
            return;
        }

        if (!selectedBankCode) {
            setError('Please select a bank first');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const result = await verifyBankAccount(accountNumber, selectedBankCode);

            if (result) {
                setAccountName(result.accountName);
                setError(null);
            } else {
                setError('Could not verify account. Please check the details and try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify account');
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!organizationId || !currentUser) {
            setError('You must be logged in to add a driver');
            return;
        }

        // Check subscription limit before creating
        if (!canAddResource(currentDriverCount, driverLimit)) {
            setShowLimitModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            const fullName = formData.get('fullName') as string;
            const phone = formData.get('phone') as string;
            const license = formData.get('license') as string;
            const nin = formData.get('nin') as string;
            const baseSalary = formData.get('baseSalary') as string;
            const pensionRate = formData.get('pensionRate') as string;
            const nhfRate = formData.get('nhfRate') as string;
            const accountNumber = formData.get('accountNumber') as string;
            const accountName = formData.get('accountName') as string;
            const bankName = formData.get('bankName') as string;
            const bankCode = formData.get('bankCode') as string;

            if (!fullName || !phone) {
                setError('Name and phone are required');
                setLoading(false);
                return;
            }

            if (!baseSalary || Number(baseSalary) <= 0) {
                setError('Please enter a valid base salary');
                setLoading(false);
                return;
            }

            // Step 1: Create driver in Firestore to get the driver ID
            const driverId = await createDriver(
                organizationId,
                {
                    name: fullName,
                    phone: phone,
                    licenseNumber: license || '',
                    nin: nin || '',
                    status: 'Idle',
                    location: '',
                    avatar: '',
                    licensePhotoUrl: '',
                    payrollInfo: {
                        baseSalary: Number(baseSalary),
                        pensionContributionRate: pensionRate ? Number(pensionRate) : 8,
                        nhfContributionRate: nhfRate ? Number(nhfRate) : 2.5,
                    },
                    bankInfo: accountNumber && accountName && bankName ? {
                        accountNumber: accountNumber,
                        accountName: accountName,
                        bankName: bankName,
                        bankCode: bankCode || undefined,
                    } : undefined,
                },
                currentUser.uid
            );

            // Step 2: Upload photos to Firebase Storage if provided
            let photoURL = '';
            let licensePhotoURL = '';

            if (driverPhoto) {
                try {
                    photoURL = await uploadDriverPhoto(driverPhoto, driverId, organizationId);
                } catch (uploadError) {
                    console.error('Error uploading driver photo:', uploadError);
                    // Don't fail the entire operation if photo upload fails
                }
            }

            if (licensePhoto) {
                try {
                    licensePhotoURL = await uploadDriverLicense(licensePhoto, driverId, organizationId);
                } catch (uploadError) {
                    console.error('Error uploading license photo:', uploadError);
                    // Don't fail the entire operation if license upload fails
                }
            }

            // Step 3: Update driver with photo URLs if uploads were successful
            if (photoURL || licensePhotoURL) {
                const { updateDriver } = await import('../../services/firestore/drivers');
                await updateDriver(driverId, {
                    avatar: photoURL,
                    licensePhotoUrl: licensePhotoURL,
                });
            }

            // Step 4: Send notification about new driver
            await notifyDriverOnboarded(currentUser.uid, organizationId, fullName);

            onClose();
        } catch (err: any) {
            console.error('Error creating driver:', err);
            setError(err.message || 'Failed to create driver');
            setLoading(false);
        }
    };

    const handleUpgrade = () => {
        setShowLimitModal(false);
        onClose();
        // Navigate to subscription page if callback is provided
        if (onUpgradePlan) {
            onUpgradePlan();
        }
    };

    return (
        <>
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceType="drivers"
                currentPlan={subscriptionPlan}
                onUpgrade={handleUpgrade}
            />
            <ModalBase title={t('modals.addDriver.title')} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Subscription Limit Warning Banner */}
                {driverLimit !== undefined && (
                    <div className={`rounded-lg p-4 border ${
                        currentDriverCount >= driverLimit
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : currentDriverCount >= driverLimit * 0.8
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {currentDriverCount >= driverLimit ? (
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                ) : currentDriverCount >= driverLimit * 0.8 ? (
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-semibold mb-1 ${
                                    currentDriverCount >= driverLimit
                                        ? 'text-red-800 dark:text-red-300'
                                        : currentDriverCount >= driverLimit * 0.8
                                        ? 'text-yellow-800 dark:text-yellow-300'
                                        : 'text-blue-800 dark:text-blue-300'
                                }`}>
                                    {currentDriverCount >= driverLimit
                                        ? '⚠️ Driver Limit Reached'
                                        : currentDriverCount >= driverLimit * 0.8
                                        ? '⚡ Approaching Driver Limit'
                                        : '✓ Driver Capacity Available'
                                    }
                                </h4>
                                <p className={`text-sm ${
                                    currentDriverCount >= driverLimit
                                        ? 'text-red-700 dark:text-red-400'
                                        : currentDriverCount >= driverLimit * 0.8
                                        ? 'text-yellow-700 dark:text-yellow-400'
                                        : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                    You are using <span className="font-bold">{currentDriverCount}</span> of <span className="font-bold">{driverLimit}</span> drivers on your <span className="font-semibold capitalize">{subscriptionPlan}</span> plan.
                                    {currentDriverCount < driverLimit && (
                                        <span className="block mt-1">
                                            {driverLimit - currentDriverCount} driver{driverLimit - currentDriverCount !== 1 ? 's' : ''} remaining.
                                        </span>
                                    )}
                                </p>
                                {currentDriverCount >= driverLimit && (
                                    <button
                                        type="button"
                                        onClick={handleUpgrade}
                                        className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                                    >
                                        Upgrade Plan →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                <InputField label={t('modals.addDriver.fullName')} id="fullName" placeholder="e.g., John Doe" />
                <InputField label={t('modals.addDriver.phone')} id="phone" type="tel" placeholder="e.g., (555) 123-4567" />
                <InputField label={t('modals.addDriver.license')} id="license" placeholder="Enter license number" />
                <InputField label={`${t('modals.addDriver.nin')} (${t('common.optional')})`} id="nin" placeholder="Enter National Identification Number" />

                <div className="border-t pt-4 mt-4 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payroll Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Annual Base Salary (₦)" id="baseSalary" type="number" placeholder="e.g., 3600000" />
                        <InputField label="Pension Rate (%)" id="pensionRate" type="number" placeholder="e.g., 8" />
                        <InputField label="NHF Rate (%)" id="nhfRate" type="number" placeholder="e.g., 2.5" />
                    </div>
                </div>

                <div className="border-t pt-4 mt-4 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Bank Account Details</h3>

                    {/* Bank Selection */}
                    <div className="mb-4">
                        <label htmlFor="bankSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Bank</label>
                        <select
                            id="bankSelect"
                            value={selectedBankCode}
                            onChange={(e) => {
                                setSelectedBankCode(e.target.value);
                                const selectedBank = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                                const bankNameInput = document.getElementById('bankName') as HTMLInputElement;
                                if (bankNameInput && selectedBank) {
                                    bankNameInput.value = selectedBank.name;
                                }
                                setAccountName(''); // Reset account name when bank changes
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        >
                            <option value="">-- Select a bank --</option>
                            {NIGERIAN_BANKS.map(bank => (
                                <option key={bank.code} value={bank.code}>
                                    {bank.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Account Number */}
                        <div>
                            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                            <input
                                type="text"
                                id="accountNumber"
                                name="accountNumber"
                                maxLength={10}
                                placeholder="e.g., 0123456789"
                                className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                onChange={() => setAccountName('')} // Clear name when account number changes
                            />
                        </div>

                        {/* Verify Button */}
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleVerifyAccount}
                                disabled={verifying}
                                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verifying ? 'Verifying...' : 'Verify Account'}
                            </button>
                        </div>
                    </div>

                    {/* Account Name (Auto-populated after verification) */}
                    {accountName && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                ✓ Account verified: {accountName}
                            </p>
                        </div>
                    )}

                    {/* Hidden fields for submission */}
                    <input type="hidden" id="accountName" name="accountName" value={accountName} />
                    <input type="hidden" id="bankName" name="bankName" />
                    <input type="hidden" id="bankCode" name="bankCode" value={selectedBankCode} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('modals.addDriver.photo')}</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
                           {driverPhotoPreview ? (
                               <img src={driverPhotoPreview} alt="Driver preview" className="w-full h-full object-cover" />
                           ) : (
                               <span className="text-xs text-gray-400">Preview</span>
                           )}
                        </div>
                        <div className="flex items-center">
                            <input 
                                type="file" 
                                id="driver-photo-input" 
                                ref={driverPhotoInputRef} 
                                className="hidden" 
                                onChange={(e) => handleFileChange(e, setDriverPhoto)}
                                accept="image/*"
                            />
                            <button 
                                type="button" 
                                onClick={() => driverPhotoInputRef.current?.click()}
                                className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900 transition-colors"
                            >
                                {t('common.chooseFile')}
                            </button>
                            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 truncate w-32">
                                {driverPhoto ? driverPhoto.name : t('common.noFileChosen')}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{`${t('modals.addDriver.licensePhoto')} (${t('common.optional')})`}</label>
                    <div className="flex items-center">
                         <input 
                            type="file" 
                            id="license-photo-input" 
                            ref={licensePhotoInputRef} 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, setLicensePhoto)}
                            accept="image/*"
                        />
                        <button 
                            type="button" 
                            onClick={() => licensePhotoInputRef.current?.click()}
                            className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold hover:bg-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900 transition-colors"
                        >
                            {t('common.chooseFile')}
                        </button>
                        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 truncate w-32">
                            {licensePhoto ? licensePhoto.name : t('common.noFileChosen')}
                        </span>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300 disabled:opacity-50">{t('common.cancel')}</button>
                    <button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : t('modals.addDriver.saveButton')}
                    </button>
                </div>
                </form>
            </ModalBase>
        </>
    );
};

export default AddDriverModal;