import React, { useState, useRef } from 'react';
import ModalBase from './ModalBase';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileSettingsModalProps {
    onClose: () => void;
}

const InputField: React.FC<{label: string, id: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled?: boolean }> = 
    ({ label, id, type = 'text', value, onChange, disabled = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input 
            type={type} 
            id={id} 
            name={id} 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 disabled:opacity-50" 
        />
    </div>
);

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ onClose }) => {
    const { currentUser, updateDisplayName, updatePassword, updateProfilePicture, updateNotificationPreferences } = useAuth();
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [whatsappOptIn, setWhatsappOptIn] = useState(currentUser?.whatsappOptIn || false);
    const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(currentUser?.phone || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(currentUser?.photoURL || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password && password !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        try {
            let changesMade = false;
            if (imageFile) {
                await updateProfilePicture(imageFile);
                changesMade = true;
            }
            if (displayName !== currentUser?.displayName) {
                await updateDisplayName(displayName);
                changesMade = true;
            }
            if (password) {
                await updatePassword(password);
                setPassword('');
                setConfirmPassword('');
                changesMade = true;
            }
            if (whatsappOptIn !== currentUser?.whatsappOptIn || whatsappPhoneNumber !== currentUser?.phone) {
                await updateNotificationPreferences({ whatsappOptIn, phone: whatsappPhoneNumber });
                changesMade = true;
            }
            if (changesMade) {
                setSuccess("Profile updated successfully!");
            }
        } catch (err) {
            setError("Failed to update profile.");
            console.error(err);
        }
    };

    return (
        <ModalBase title="Profile Settings" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-red-600 bg-red-100 p-3 rounded-md dark:bg-red-900/20 dark:text-red-300">{error}</div>}
                {success && <div className="text-sm text-green-600 bg-green-100 p-3 rounded-md dark:bg-green-900/20 dark:text-green-300">{success}</div>}
                
                <div className="flex flex-col items-center gap-4 pt-2 pb-4">
                    <img
                        src={imagePreview || 'https://via.placeholder.com/100'}
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-slate-700"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Change Photo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                    />
                </div>

                <InputField 
                    label="Full Name" 
                    id="displayName" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                />
                <InputField 
                    label="Email Address" 
                    id="email" 
                    type="email"
                    value={currentUser?.email || ''} 
                    onChange={() => {}} 
                    disabled 
                />
                 <div className="pt-4 border-t dark:border-slate-700">
                     <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100">Change Password</h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Leave blank to keep your current password.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <InputField 
                            label="New Password" 
                            id="password" 
                            type="password"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                         <InputField 
                            label="Confirm New Password" 
                            id="confirmPassword" 
                            type="password"
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                        />
                     </div>
                 </div>

                 <div className="pt-4 border-t dark:border-slate-700">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100">Notification Preferences</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Opt-in to receive updates on your preferred channels.</p>
                    <div className="space-y-4">
                        <label htmlFor="whatsappOptIn" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                id="whatsappOptIn"
                                checked={whatsappOptIn}
                                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Receive shipment updates on WhatsApp</span>
                        </label>
                        <InputField 
                            label="WhatsApp Phone Number" 
                            id="whatsappPhoneNumber" 
                            type="tel"
                            value={whatsappPhoneNumber} 
                            onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
                            disabled={!whatsappOptIn}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Standard messaging rates may apply.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">Close</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">Save Changes</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default ProfileSettingsModal;