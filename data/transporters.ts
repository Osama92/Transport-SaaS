import type { Transporter } from '../types';

export const initialTransporters: Transporter[] = [
    { id: 'T01', name: 'FastLane Logistics', rating: 4.8, status: 'Active', contactEmail: 'contact@fastlane.com', contactPhone: '(555) 101-2020', lat: 6.595535, lng: 3.341595 },
    { id: 'T02', name: 'QuickMove Express', rating: 4.5, status: 'Active', contactEmail: 'support@quickmove.com', contactPhone: '(555) 102-3030', lat: 6.465422, lng: 3.406448 },
    { id: 'T03', name: 'Reliable Couriers', rating: 4.9, status: 'Active', contactEmail: 'ops@reliable.com', contactPhone: '(555) 103-4040' },
    { id: 'T04', name: 'Global Transport Inc.', rating: 4.2, status: 'Inactive', contactEmail: 'info@globaltransport.com', contactPhone: '(555) 104-5050' },
];