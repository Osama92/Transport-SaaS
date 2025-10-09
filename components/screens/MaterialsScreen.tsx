import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Material } from '../../types';
import { PlusIcon, ArchiveBoxIcon, PencilIcon, TrashIcon } from '../Icons';

interface MaterialsScreenProps {
    materials: Material[];
    onAddMaterial: (newMaterial: Omit<Material, 'id'>) => void;
}

const initialFormState = {
    name: '',
    description: '',
    defaultUom: '',
};

const MaterialsScreen: React.FC<MaterialsScreenProps> = ({ materials, onAddMaterial }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(initialFormState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.defaultUom) {
            onAddMaterial(formData);
            setFormData(initialFormState);
        } else {
            alert('Please fill in at least the material name and unit of measure.');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('screens.materials.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('screens.materials.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add a new material */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{t('screens.materials.formTitle')}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('screens.materials.nameLabel')}</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('screens.materials.namePlaceholder')} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" required />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('screens.materials.descLabel')}</label>
                            <input type="text" id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('screens.materials.descPlaceholder')} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" />
                        </div>
                         <div>
                            <label htmlFor="defaultUom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('screens.materials.uomLabel')}</label>
                            <input type="text" id="defaultUom" name="defaultUom" value={formData.defaultUom} onChange={handleChange} placeholder={t('screens.materials.uomPlaceholder')} className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" required />
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">
                            <PlusIcon className="w-5 h-5" /> {t('screens.materials.addButton')}
                        </button>
                    </form>
                </div>

                {/* Table of existing materials */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                <tr>
                                    <th className="py-3 px-4 font-medium">{t('screens.materials.tableHeaderName')}</th>
                                    <th className="py-3 px-4 font-medium">{t('screens.materials.tableHeaderDesc')}</th>
                                    <th className="py-3 px-4 font-medium">{t('screens.materials.tableHeaderUom')}</th>
                                    <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map((material) => (
                                    <tr key={material.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{material.name}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{material.description}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{material.defaultUom}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md dark:hover:bg-slate-700"><PencilIcon className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md dark:hover:bg-slate-700"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {materials.length === 0 && (
                            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                                <ArchiveBoxIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600" />
                                <h3 className="mt-2 text-lg font-semibold">No Materials Found</h3>
                                <p className="text-sm">Add a material using the form to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialsScreen;