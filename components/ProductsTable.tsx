import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Product } from '../types';
import { ChevronDownIcon, EllipsisHorizontalIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ArrowDownTrayIcon } from './Icons';

interface ProductsTableProps {
    products: Product[];
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const baseClasses = "flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg w-32 justify-between";
    const statusClasses: { [key: string]: string } = {
        'Process': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Out Stock': 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        'Inactive': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        'Draft List': 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    };
    const dotClasses: { [key: string]: string } = {
        'Process': 'bg-green-500',
        'Out Stock': 'bg-orange-500',
        'Inactive': 'bg-red-500',
        'Draft List': 'bg-gray-500',
    };

    return (
        <div className={`${baseClasses} ${statusClasses[status] || 'bg-gray-100 text-gray-700'}`}>
            <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dotClasses[status] || 'bg-gray-500'}`}></span>
                {status}
            </div>
            <ChevronDownIcon className="w-4 h-4" />
        </div>
    );
};

const ProductsTable: React.FC<ProductsTableProps> = ({ products }) => {
    const { t } = useTranslation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dashboard.products_table_title')}</h3>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"><MagnifyingGlassIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/></button>
                    <button className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">{t('dashboard.products_table_all_status')} <ChevronDownIcon className="w-4 h-4"/></button>
                    <button className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"><AdjustmentsHorizontalIcon className="w-5 h-5"/> {t('dashboard.products_table_filters')}</button>
                    <button className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">{t('dashboard.products_table_export')} <ArrowDownTrayIcon className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
                        <tr>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_product')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_id')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_price')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_stock')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_status')}</th>
                            <th className="py-3 px-4 font-medium">{t('dashboard.products_table_header_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id} className="border-b hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-100">{product.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{product.company}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{product.id}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.date}</p>
                                </td>
                                <td className="py-4 px-4">
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(product.price)}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Sell Price {formatCurrency(product.sellPrice)}</p>
                                </td>
                                <td className="py-4 px-4 font-medium text-gray-700 dark:text-gray-300">{product.stock.toLocaleString()}</td>
                                <td className="py-4 px-4"><StatusBadge status={product.status} /></td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <button className="text-sm font-medium text-gray-600 border px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700">{t('dashboard.products_table_details_button')}</button>
                                        <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"><EllipsisHorizontalIcon className="w-6 h-6"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductsTable;