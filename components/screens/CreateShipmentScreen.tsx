import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, XMarkIcon } from '../Icons';
import type { DeliveryContact, DeliveryStop, Material } from '../../types';

type NewStopData = Omit<DeliveryStop, 'id' | 'status'>;

interface CreateShipmentScreenProps {
    onBack: () => void;
    onCreateShipment: (stops: NewStopData[]) => void;
    deliveryContacts: DeliveryContact[];
    materials: Material[];
}

const initialFormState: NewStopData = {
    itemName: '',
    quantity: 1,
    uom: '',
    recipientName: '',
    destination: '',
    contactPhone: '',
    imageUrl: undefined,
};

const InputField: React.FC<{label: string, id: string, name: keyof NewStopData, type?: string, placeholder: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, disabled?: boolean}> = 
    ({ label, id, name, type = 'text', placeholder, value, onChange, required=true, disabled=false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input 
            type={type} 
            id={id} 
            name={name} 
            placeholder={placeholder} 
            value={value} 
            onChange={onChange} 
            required={required}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 disabled:bg-gray-200 dark:disabled:bg-slate-600" 
        />
    </div>
);

const CreateShipmentScreen: React.FC<CreateShipmentScreenProps> = ({ onBack, onCreateShipment, deliveryContacts, materials }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<NewStopData>(initialFormState);
    const [deliveryStops, setDeliveryStops] = useState<NewStopData[]>([]);
    const [selectedContactId, setSelectedContactId] = useState('');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (parseInt(value, 10) || 0) : value
        }));
    };

    const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMaterialId = e.target.value;
        const material = materials.find(m => m.id === selectedMaterialId);
        
        if (material) {
             setFormData(prev => ({
                ...prev,
                itemName: material.name,
                uom: material.defaultUom
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                itemName: '',
                uom: ''
            }));
        }
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const contactId = e.target.value;
        setSelectedContactId(contactId);

        if (contactId) {
            const contact = deliveryContacts.find(c => c.id === contactId);
            if (contact) {
                setFormData(prev => ({
                    ...prev,
                    recipientName: contact.recipientName,
                    destination: contact.address,
                    contactPhone: contact.phone,
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                recipientName: '',
                destination: '',
                contactPhone: '',
            }));
        }
    };

    const handleAddStopToList = () => {
        if (formData.itemName && formData.recipientName && formData.destination && formData.contactPhone) {
            setDeliveryStops(prev => [...prev, formData]);
            setFormData(initialFormState);
            setSelectedContactId('');
        } else {
            alert("Please fill in all required fields before adding the delivery stop.");
        }
    };

    const handleRemoveStop = (indexToRemove: number) => {
        setDeliveryStops(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleCreateShipment = () => {
        if (deliveryStops.length > 0) {
            onCreateShipment(deliveryStops);
        }
    };

    const isMaterialSelected = materials.some(m => m.name === formData.itemName);

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                    <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.createShipment.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.createShipment.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form for adding an item */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm space-y-6">
                    <h3 className="text-lg font-bold">{t('screens.createShipment.addItemToDispatchTitle')}</h3>
                    <div>
                        <label htmlFor="material-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('screens.createShipment.itemNameLabel')}</label>
                        <select
                            id="material-select"
                            value={materials.find(m => m.name === formData.itemName)?.id || ''}
                            onChange={handleMaterialChange}
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        >
                            <option value="">{t('screens.createShipment.savedMaterialPlaceholder')}</option>
                            {materials.map(material => (
                                <option key={material.id} value={material.id}>{material.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label={t('screens.createShipment.quantityLabel')} id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="1" />
                        <InputField label={t('screens.createShipment.uomLabel')} id="uom" name="uom" value={formData.uom} onChange={handleChange} placeholder={t('screens.createShipment.uomPlaceholder')} disabled={isMaterialSelected} />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                         <div>
                            <label htmlFor="saved-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('screens.createShipment.savedContactLabel')}</label>
                            <select
                                id="saved-contact"
                                value={selectedContactId}
                                onChange={handleContactChange}
                                className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                            >
                                <option value="">{t('screens.createShipment.savedContactPlaceholder')}</option>
                                {deliveryContacts.map(contact => (
                                    <option key={contact.id} value={contact.id}>{contact.name} - {contact.recipientName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label={t('screens.createShipment.recipientNameLabel')} id="recipientName" name="recipientName" value={formData.recipientName} onChange={handleChange} placeholder={t('screens.createShipment.recipientNamePlaceholder')} />
                            <InputField label={t('screens.createShipment.contactPhoneLabel')} id="contactPhone" name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} placeholder={t('screens.createShipment.contactPhonePlaceholder')} />
                        </div>
                        <InputField label={t('screens.createShipment.deliveryLocationLabel')} id="destination" name="destination" value={formData.destination} onChange={handleChange} placeholder={t('screens.createShipment.deliveryLocationPlaceholder')} />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={handleAddStopToList} className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">
                            {t('screens.createShipment.addItemToListButton')}
                        </button>
                    </div>
                </div>

                {/* List of added items */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold mb-4">{t('screens.createShipment.dispatchListTitle')} ({deliveryStops.length})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {deliveryStops.length > 0 ? (
                            deliveryStops.map((item, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{item.itemName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">To: {item.recipientName}, {item.destination}</p>
                                    </div>
                                    <button onClick={() => handleRemoveStop(index)} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/50">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                <p>Delivery stops added to the shipment will appear here.</p>
                            </div>
                        )}
                    </div>
                     <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
                        <button 
                            type="button" 
                            onClick={handleCreateShipment} 
                            disabled={deliveryStops.length === 0}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {t('screens.createShipment.submitBatchButton', {count: deliveryStops.length})}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateShipmentScreen;