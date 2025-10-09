import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ModalBase from './ModalBase';

interface AddDriverModalProps {
    onClose: () => void;
}

const InputField: React.FC<{label: string, id: string, type?: string, placeholder: string}> = ({ label, id, type = 'text', placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} id={id} name={id} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
    </div>
);

const AddDriverModal: React.FC<AddDriverModalProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const [driverPhoto, setDriverPhoto] = useState<File | null>(null);
    const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
    
    const driverPhotoInputRef = useRef<HTMLInputElement>(null);
    const licensePhotoInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };
    
    const driverPhotoPreview = driverPhoto ? URL.createObjectURL(driverPhoto) : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission logic
        console.log("Driver form submitted");
        onClose();
    };

    return (
        <ModalBase title={t('modals.addDriver.title')} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField label={t('modals.addDriver.fullName')} id="fullName" placeholder="e.g., John Doe" />
                <InputField label={t('modals.addDriver.phone')} id="phone" type="tel" placeholder="e.g., (555) 123-4567" />
                <InputField label={t('modals.addDriver.license')} id="license" placeholder="Enter license number" />
                <InputField label={`${t('modals.addDriver.nin')} (${t('common.optional')})`} id="nin" placeholder="Enter National Identification Number" />

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
                    <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-300">{t('common.cancel')}</button>
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-700">{t('modals.addDriver.saveButton')}</button>
                </div>
            </form>
        </ModalBase>
    );
};

export default AddDriverModal;