import React from 'react';
import type { Shipment, DeliveryStop } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { XMarkIcon, QrCodeIcon } from '../Icons';

interface WaybillModalProps {
    shipment: Shipment;
    stop: DeliveryStop;
    onClose: () => void;
}

const WaybillModal: React.FC<WaybillModalProps> = ({ shipment, stop, onClose }) => {
    const { currentUser } = useAuth();
    const companyDetails = {
        name: currentUser?.displayName ? `${currentUser.displayName}'s Logistics` : 'Logistics Inc.',
        address: '123 Transport Way, Suite 100, Metro City, 12345',
        phone: '(555) 123-4567',
        email: currentUser?.email || 'contact@logistics.inc'
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 print:bg-white">
             {/* Printable Waybill Component */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-waybill, #printable-waybill * {
                            visibility: visible;
                        }
                        #printable-waybill {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            margin: 0;
                            padding: 20px;
                            border: none;
                            box-shadow: none;
                        }
                    }
                `}
            </style>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col relative">
                {/* Modal Header for screen view */}
                <header className="flex justify-between items-center p-5 border-b dark:border-slate-700 print:hidden">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Waybill for Stop: {stop.id}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Content Area */}
                <main id="printable-waybill" className="p-6 overflow-y-auto bg-white text-black">
                    <div className="border border-gray-300 p-6 rounded-lg">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-gray-300">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{companyDetails.name}</h2>
                                <p className="text-xs">{companyDetails.address}</p>
                                <p className="text-xs">{companyDetails.phone} | {companyDetails.email}</p>
                            </div>
                            <div className="text-right">
                                <h1 className="text-3xl font-bold text-gray-900 uppercase">Waybill</h1>
                                <p className="text-sm font-mono mt-1">Shipment ID: {shipment.id}</p>
                                <p className="text-sm">Date: {shipment.date}</p>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="grid grid-cols-2 gap-6 py-4 border-b border-gray-300">
                            <div>
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Shipper / From:</h4>
                                <p className="font-semibold">{companyDetails.name}</p>
                                <p className="text-sm">{shipment.origin}</p>
                            </div>
                            <div>
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Consignee / To:</h4>
                                <p className="font-semibold">{stop.recipientName}</p>
                                <p className="text-sm">{stop.destination}</p>
                                <p className="text-sm">Phone: {stop.contactPhone}</p>
                            </div>
                        </div>

                        {/* Item Details */}
                        <div className="py-4">
                             <h4 className="text-xs uppercase font-bold text-gray-500 mb-2">Shipment Contents for this Stop</h4>
                             <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 font-semibold">Item Description</th>
                                        <th className="p-2 font-semibold text-center">Quantity</th>
                                        <th className="p-2 font-semibold text-center">Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="p-2">{stop.itemName}</td>
                                        <td className="p-2 text-center">{stop.quantity}</td>
                                        <td className="p-2 text-center">{stop.uom}</td>
                                    </tr>
                                </tbody>
                             </table>
                        </div>

                        {/* Signature & QR */}
                        <div className="flex justify-between items-end pt-8 mt-4">
                             <div>
                                <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">Received By:</h4>
                                <div className="border-b border-gray-400 w-64 h-12 mt-2"></div>
                                <p className="text-xs text-gray-500 mt-1">Print Name & Sign</p>
                            </div>
                             <div className="text-center">
                                <QrCodeIcon className="w-20 h-20 text-gray-800" />
                                <p className="text-xs font-mono mt-1">{stop.id}</p>
                            </div>
                        </div>
                    </div>
                </main>
                 {/* Modal Footer for screen view */}
                <footer className="flex justify-end p-4 border-t dark:border-slate-700 print:hidden">
                    <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">
                        Print Waybill
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default WaybillModal;