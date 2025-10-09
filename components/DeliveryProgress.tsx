import React from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisHorizontalIcon, MapPinIcon } from './Icons';
import type { Shipment, TrackingEvent, Transporter } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const ProgressStep: React.FC<{step: TrackingEvent, isLast: boolean}> = ({ step, isLast }) => {
    const isCompleted = step.status === 'completed';
    const isActive = step.status === 'active';
    
    const formattedTimestamp = new Date(step.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
    }).replace(',', '');

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? 'bg-indigo-500 border-indigo-500' : 
                    isCompleted ? 'bg-gray-200 dark:bg-slate-600 border-gray-200 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-500'
                }`}>
                    {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    {isCompleted && <div className="w-2 h-2 bg-gray-400 dark:bg-slate-400 rounded-full"></div>}
                </div>
                {!isLast && <div className={`w-px flex-grow ${isCompleted || isActive ? 'bg-gray-300 dark:bg-slate-600' : 'bg-gray-300 dark:bg-slate-600'}`}></div>}
            </div>
            <div className={`pb-8 ${isLast ? '' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-semibold ${isActive ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>{step.title}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{step.subtitle}</p>
                    </div>
                     <p className={`text-sm ${isActive ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>{formattedTimestamp}</p>
                </div>
            </div>
        </div>
    );
};

interface DeliveryProgressProps {
    shipment: Shipment | null;
    transporter?: Transporter | null;
}

const DeliveryProgress: React.FC<DeliveryProgressProps> = ({ shipment, transporter }) => {
    const { t } = useTranslation();

    const sortedHistory = shipment?.trackingHistory ? 
        [...shipment.trackingHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];

    const hasLocation = transporter && transporter.lat != null && transporter.lng != null;
    const position: [number, number] | undefined = hasLocation ? [transporter.lat!, transporter.lng!] : undefined;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dashboard.delivery_progress_title')}</h3>
                 <button className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100">
                    <EllipsisHorizontalIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="mb-4 rounded-lg overflow-hidden h-48 bg-gray-200 dark:bg-slate-700">
                {position ? (
                    <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position}>
                            <Popup>
                                {transporter?.name} is here.
                            </Popup>
                        </Marker>
                    </MapContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <MapPinIcon className="w-8 h-8 mx-auto text-gray-400 dark:text-slate-500 mb-2"/>
                            <p className="text-sm font-semibold">No live location data</p>
                            <p className="text-xs">Location will appear for shipments in transit.</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                 {shipment && sortedHistory.length > 0 ? (
                    sortedHistory.map((step, index) => (
                        <ProgressStep key={index} step={step} isLast={index === (sortedHistory.length ?? 0) - 1} />
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-2"/>
                        <p className="font-semibold">No Shipment Tracked</p>
                        <p className="text-sm">Click 'Track' on a shipment to see its progress here.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default DeliveryProgress;