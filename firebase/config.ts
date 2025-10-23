import type { 
    Transporter, 
    Shipment, 
    Product, 
    Visit, 
    Driver, 
    Vehicle, 
    Client, 
    Route, 
    Invoice,
    Notification,
    DeliveryContact,
    DriverPerformanceData,
    SubscriptionPlan,
    Material,
    PayrollRun,
    Payslip
} from '../types';

// --- START OF MOCK DATA ---
const initialTransporters: Transporter[] = [
    { id: 'T01', name: 'FastLane Logistics', rating: 4.8, status: 'Active', contactEmail: 'contact@fastlane.com', contactPhone: '(555) 101-2020', lat: 6.595535, lng: 3.341595 },
    { id: 'T02', name: 'QuickMove Express', rating: 4.5, status: 'Active', contactEmail: 'support@quickmove.com', contactPhone: '(555) 102-3030', lat: 6.465422, lng: 3.406448 },
    { id: 'T03', name: 'Reliable Couriers', rating: 4.9, status: 'Active', contactEmail: 'ops@reliable.com', contactPhone: '(555) 103-4040' },
    { id: 'T04', name: 'Global Transport Inc.', rating: 4.2, status: 'Inactive', contactEmail: 'info@globaltransport.com', contactPhone: '(555) 104-5050' },
];

const initialShipments: Shipment[] = [
    {
        id: '#SHIP-F29GCU',
        origin: 'New York, NY',
        date: 'Sep 29, 2025',
        status: 'Pending',
        imageUrl: 'https://picsum.photos/seed/ship1/400/200',
        cost: 525000,
        estimatedDeliveryTimestamp: '2025-10-05T18:00:00Z',
        stops: [
            { id: 'STOP-001A', recipientName: 'Alice Johnson', destination: '123 Tech Avenue, San Francisco, CA 94107', status: 'Pending', itemName: 'Industrial Machine Parts', quantity: 2, uom: 'crates', contactPhone: '555-0101' },
            { id: 'STOP-001B', recipientName: 'John Smith', destination: '456 Innovation Drive, Austin, TX 78701', status: 'Pending', itemName: 'Server Racks', quantity: 5, uom: 'units', contactPhone: '555-0102' },
        ],
        trackingHistory: [
            { title: 'Shipment Created', subtitle: 'Awaiting assignment to transporter', timestamp: '2025-09-29T10:00:00Z', status: 'active' },
        ],
    },
    {
        id: '#SHIP-A82B3D',
        origin: 'Lagos, NG',
        date: 'Sep 28, 2025',
        status: 'In Transit',
        transporterId: 'T01',
        imageUrl: 'https://picsum.photos/seed/ship2/400/200',
        cost: 1230000,
        estimatedDeliveryTimestamp: '2025-10-02T12:00:00Z',
        stops: [
            { id: 'STOP-002A', recipientName: 'Bob Williams', destination: '789 Market Street, Philadelphia, PA 19106', status: 'Delivered', itemName: 'Office Furniture', quantity: 10, uom: 'pieces', contactPhone: '555-0103' },
            { id: 'STOP-002B', recipientName: 'Charlie Brown', destination: '101 Pine Lane, Seattle, WA 98101', status: 'Out for Delivery', itemName: 'Electronic Components', quantity: 50, uom: 'boxes', contactPhone: '555-0104' },
        ],
        trackingHistory: [
            { title: 'Shipment Created', subtitle: 'Awaiting assignment', timestamp: '2025-09-28T09:00:00Z', status: 'completed' },
            { title: 'Assigned to Transporter', subtitle: 'Assigned to FastLane Logistics', timestamp: '2025-09-28T11:00:00Z', status: 'completed' },
            { title: 'In Transit', subtitle: 'Shipment is on its way', timestamp: '2025-09-28T14:00:00Z', status: 'active' },
        ],
    },
    {
        id: '#SHIP-C19XFE',
        origin: 'London, UK',
        date: 'Sep 27, 2025',
        status: 'Completed',
        transporterId: 'T02',
        imageUrl: 'https://picsum.photos/seed/ship3/400/200',
        cost: 727500,
        estimatedDeliveryTimestamp: '2025-09-28T12:00:00Z',
        completedTimestamp: '2025-09-28T16:00:00Z',
        stops: [
            { id: 'STOP-003A', recipientName: 'Diana Prince', destination: '212 Oak Avenue, Chicago, IL 60601', status: 'Delivered', itemName: 'Retail Goods', quantity: 2, uom: 'pallets', contactPhone: '555-0105' },
        ],
        trackingHistory: [
            { title: 'Shipment Created', subtitle: '', timestamp: '2025-09-27T08:00:00Z', status: 'completed' },
            { title: 'Assigned to Transporter', subtitle: 'Assigned to QuickMove Express', timestamp: '2025-09-27T09:30:00Z', status: 'completed' },
            { title: 'In Transit', subtitle: '', timestamp: '2025-09-27T12:00:00Z', status: 'completed' },
            { title: 'Shipment Delivered', subtitle: 'All stops completed', timestamp: '2025-09-28T16:00:00Z', status: 'completed' },
            { title: 'POD Shared', subtitle: 'Proof of Delivery has been shared.', timestamp: '2025-09-28T16:05:00Z', status: 'active' },
        ],
    },
    {
        id: '#SHIP-D45YTR',
        origin: 'Paris, FR',
        date: 'Aug 15, 2025',
        status: 'Completed',
        transporterId: 'T01',
        imageUrl: 'https://picsum.photos/seed/ship4/400/200',
        cost: 915000,
        estimatedDeliveryTimestamp: '2025-08-20T12:00:00Z',
        completedTimestamp: '2025-08-19T18:00:00Z',
        stops: [{ id: 'STOP-004A', recipientName: 'Eva Green', destination: '1 Champs-Élysées, Paris', status: 'Delivered', itemName: 'Luxury Handbags', quantity: 25, uom: 'pcs', contactPhone: '555-0106' }],
        trackingHistory: [{ title: 'Shipment Created', subtitle: '', timestamp: '2025-08-15T10:00:00Z', status: 'completed' }],
    },
];

const initialProducts: Product[] = [
    { id: '#PRD-723', name: 'Wireless Headphones', company: 'AudioMax', date: 'Sep 29, 2025', price: 29999, sellPrice: 35000, stock: 1200, status: 'Process', image: 'https://picsum.photos/seed/product1/40/40' },
    { id: '#PRD-451', name: 'Smartwatch Series 8', company: 'TechGear', date: 'Sep 28, 2025', price: 52000, sellPrice: 60000, stock: 850, status: 'Process', image: 'https://picsum.photos/seed/product2/40/40' },
    { id: '#PRD-982', name: 'Organic Coffee Beans', company: 'Brewtiful', date: 'Sep 28, 2025', price: 8500, sellPrice: 12000, stock: 0, status: 'Out Stock', image: 'https://picsum.photos/seed/product3/40/40' },
    { id: '#PRD-337', name: 'Ergonomic Office Chair', company: 'ComfySeat', date: 'Sep 27, 2025', price: 150000, sellPrice: 185000, stock: 250, status: 'Inactive', image: 'https://picsum.photos/seed/product4/40/40' },
    { id: '#PRD-564', name: 'Portable SSD 1TB', company: 'DataStash', date: 'Sep 26, 2025', price: 89999, sellPrice: 110000, stock: 1500, status: 'Process', image: 'https://picsum.photos/seed/product5/40/40' },
];

const initialVisits: Visit[] = [
    { id: 1, name: 'John Doe', role: 'Manager', avatar: 'https://picsum.photos/seed/user1/40/40', time: '02:30 PM', date: '29 Sep 2025' },
    { id: 2, name: 'Jane Smith', role: 'Dispatcher', avatar: 'https://picsum.photos/seed/user2/40/40', time: '01:15 PM', date: '29 Sep 2025' },
    { id: 3, name: 'Emily Johnson', role: 'Auditor', avatar: 'https://picsum.photos/seed/user3/40/40', time: '11:45 AM', date: '29 Sep 2025' },
    { id: 4, name: 'Michael Brown', role: 'Supplier', avatar: 'https://picsum.photos/seed/user4/40/40', time: '10:00 AM', date: '29 Sep 2025' },
];

const initialDrivers: Driver[] = [
    { id: 1, name: 'Tunde Adekunle', location: 'Lagos', status: 'On-route', avatar: 'https://picsum.photos/seed/driver1/40/40', licenseNumber: 'LAG123456', phone: '(555) 010-1234', nin: '12345678901', licensePhotoUrl: 'https://picsum.photos/seed/license1/400/250', lat: 6.45407, lng: 3.39467, safetyScore: 98, baseSalary: 4800000, pensionContributionRate: 8, nhfContributionRate: 2.5 },
    { id: 2, name: 'Aisha Bello', location: 'Abuja', status: 'Idle', avatar: 'https://picsum.photos/seed/driver2/40/40', licenseNumber: 'ABJ654321', phone: '(555) 011-5678', lat: 9.0765, lng: 7.3986, safetyScore: 95, baseSalary: 4500000, pensionContributionRate: 8, nhfContributionRate: 2.5 },
    { id: 3, name: 'Emeka Okafor', location: 'Port Harcourt', status: 'Offline', avatar: 'https://picsum.photos/seed/driver3/40/40', licenseNumber: 'PHC987654', phone: '(555) 012-9012', safetyScore: 92, baseSalary: 5200000, pensionContributionRate: 8, nhfContributionRate: 2.5 },
    { id: 4, name: 'Fatima Garba', location: 'Kano', status: 'Idle', avatar: 'https://picsum.photos/seed/driver4/40/40', licenseNumber: 'KAN456789', phone: '(555) 013-3456', lat: 12.0022, lng: 8.5920, safetyScore: 99, baseSalary: 4200000, pensionContributionRate: 8, nhfContributionRate: 2.5 },
    { id: 5, name: 'Chinedu Eze', location: 'Enugu', status: 'On-route', avatar: 'https://picsum.photos/seed/driver5/40/40', licenseNumber: 'ENU192837', phone: '(555) 014-7890', lat: 6.4466, lng: 7.5594, safetyScore: 96, baseSalary: 6000000, pensionContributionRate: 10, nhfContributionRate: 2.5 },
    { id: 6, name: 'Yusuf Ibrahim', location: 'Lagos', status: 'On-route', avatar: 'https://picsum.photos/seed/driver6/40/40', licenseNumber: 'LAG987123', phone: '(555) 015-1122', lat: 6.5227, lng: 3.3752, safetyScore: 93, baseSalary: 7500000, pensionContributionRate: 8, nhfContributionRate: 2.5 },
];

const initialVehicles: Vehicle[] = [
    { 
        id: 'V01', group: '001', make: 'Personnel Tracker', model: 'Custom', year: 2022, plateNumber: 'KJA-123-AB', vin: 'VIN1234567890ABCDE', 
        status: 'On the Move', odometer: 1100, odometerHistory: { today: 53, yesterday: 62 }, 
        lastServiceDate: '2025-08-15', nextServiceDate: '2026-02-15', 
        maintenanceLogs: [ {id: 'M01', date: '2025-08-15', type: 'Service', odometer: 750, description: 'Routine oil change and inspection', cost: 75000} ], 
        documents: [ {id: 'D01', name: 'Vehicle Registration 2025', type: 'Registration', expiryDate: '2025-12-31', fileUrl: '#'} ], 
        lat: 6.4550, lng: 3.3841, lastUpdated: '6 months ago', currentSpeed: 31.71, 
        engineHours: { total: 90, today: 7, yesterday: 8 }, batteryLevel: 95 
    },
    { 
        id: 'V02', group: '001', make: 'Vehicle 002', model: 'Sprinter', year: 2021, plateNumber: 'APP-456-XY', vin: 'VIN6789012345FGHIJ', 
        status: 'Parked', odometer: 120100, 
        lastServiceDate: '2025-07-20', nextServiceDate: '2026-01-20', 
        maintenanceLogs: [ {id: 'M02', date: '2025-09-25', type: 'Repair', odometer: 120000, description: 'Transmission fluid leak repair', cost: 350000} ], 
        documents: [ {id: 'D02', name: 'Insurance Policy', type: 'Insurance', expiryDate: '2026-06-30', fileUrl: '#'} ], 
        lat: 6.465422, lng: 3.406448, lastUpdated: '6 months ago', currentSpeed: 0
    },
    { 
        id: 'V03', group: '001', make: 'Vehicle 003', model: 'HiAce', year: 2023, plateNumber: 'GGE-789-GH', vin: 'VINKLMN0987654321P', 
        status: 'Idle', odometer: 25400, 
        lastServiceDate: '2025-09-01', nextServiceDate: '2026-03-01', maintenanceLogs: [], documents: [], 
        lat: 6.5955, lng: 3.3416, lastUpdated: '6 months ago', currentSpeed: 0 
    },
    { 
        id: 'V04', group: '001', make: 'Vehicle 003', model: 'Urvan', year: 2020, plateNumber: 'FST-321-JK', vin: 'VINQRST5432109876V', 
        status: 'On the Move', odometer: 180500, 
        lastServiceDate: '2025-05-10', nextServiceDate: '2025-11-10', maintenanceLogs: [], documents: [], 
        lat: 6.58, lng: 3.35, lastUpdated: '6 months ago', currentSpeed: 50
    },
    { 
        id: 'V05', group: '001', make: 'Vehicle 003', model: 'Urvan', year: 2020, plateNumber: 'FST-322-JK', vin: 'VINQRST5432109877V', 
        status: 'On the Move', odometer: 190500, 
        lastServiceDate: '2025-06-10', nextServiceDate: '2025-12-10', maintenanceLogs: [], documents: [], 
        lat: 6.55, lng: 3.36, lastUpdated: '6 months ago', currentSpeed: 45
    },
    { 
        id: 'V06', group: '001', make: 'Vehicle 003', model: 'Urvan', year: 2020, plateNumber: 'FST-323-JK', vin: 'VINQRST5432109878V', 
        status: 'On the Move', odometer: 200500, 
        lastServiceDate: '2025-07-10', nextServiceDate: '2026-01-10', maintenanceLogs: [], documents: [], 
        lat: 6.53, lng: 3.39, lastUpdated: '6 months ago', currentSpeed: 60
    },
];

const initialClients: Client[] = [
    { id: 'C01', name: 'Jumia Nigeria', contactPerson: 'Adaeze Okoro', email: 'adaeze.okoro@jumia.com', phone: '(555) 201-1122', address: '123 E-commerce Rd, Lagos', tin: '12345678-0001', cacNumber: 'RC12345', status: 'Active' },
    { id: 'C02', name: 'Konga Inc.', contactPerson: 'Babatunde Adeyemi', email: 'babatunde@konga.com', phone: '(555) 202-3344', address: '456 Marketplace Ave, Abuja', tin: '87654321-0001', cacNumber: 'RC54321', status: 'Active' },
    { id: 'C03', name: 'Dangote Group', contactPerson: 'Musa Ibrahim', email: 'musa.i@dangote.com', phone: '(555) 203-5566', address: '789 Industrial Blvd, Kano', status: 'Inactive' },
];

const initialRoutes: Route[] = [
    { id: '#R-5833', driverName: 'Tunde Adekunle', driverAvatar: 'https://picsum.photos/seed/driver1/40/40', vehicle: 'KJA-123-AB', stops: 12, progress: 75, status: 'In Progress', distanceKm: 120, rate: 150000 },
    { id: '#R-5834', driverName: 'Aisha Bello', driverAvatar: 'https://picsum.photos/seed/driver2/40/40', vehicle: 'GGE-789-GH', stops: 8, progress: 100, status: 'Completed', podUrl: 'https://picsum.photos/seed/pod1/400/300', distanceKm: 85, rate: 106250, completionDate: '2025-09-28' },
    { id: '#R-5835', driverName: 'Not Assigned', driverAvatar: 'https://picsum.photos/seed/placeholder/40/40', vehicle: 'N/A', stops: 15, progress: 0, status: 'Pending', distanceKm: 210, rate: 262500 },
    { id: '#R-5836', driverName: 'Chinedu Eze', driverAvatar: 'https://picsum.photos/seed/driver5/40/40', vehicle: 'KJA-123-AB', stops: 10, progress: 100, status: 'Completed', podUrl: 'https://picsum.photos/seed/pod2/400/300', distanceKm: 95, rate: 118750, completionDate: '2025-09-25' },
    { id: '#R-5837', driverName: 'Tunde Adekunle', driverAvatar: 'https://picsum.photos/seed/driver1/40/40', vehicle: 'KJA-123-AB', stops: 10, progress: 100, status: 'Completed', distanceKm: 150, rate: 187500, completionDate: '2025-09-22' },
    { id: '#R-5838', driverName: 'Fatima Garba', driverAvatar: 'https://picsum.photos/seed/driver4/40/40', vehicle: 'GGE-789-GH', stops: 5, progress: 100, status: 'Completed', distanceKm: 60, rate: 75000, completionDate: '2025-08-15' },
    { id: '#R-5839', driverName: 'Yusuf Ibrahim', driverAvatar: 'https://picsum.photos/seed/driver6/40/40', vehicle: 'APP-456-XY', stops: 20, progress: 100, status: 'Completed', distanceKm: 250, rate: 312500, completionDate: '2025-08-30' },
    { id: '#R-5840', driverName: 'Aisha Bello', driverAvatar: 'https://picsum.photos/seed/driver2/40/40', vehicle: 'GGE-789-GH', stops: 9, progress: 100, status: 'Completed', distanceKm: 110, rate: 137500, completionDate: '2025-09-05' },
];

const initialInvoices: Invoice[] = [
    {
        id: '#INV-001',
        project: 'Jumia Deliveries - Sept',
        issuedDate: 'Sep 30, 2025',
        dueDate: 'Oct 15, 2025',
        from: { name: 'Your Company', address: '123 Logistics Lane', email: 'billing@logistics.com', phone: '(555) 123-4567' },
        to: { name: 'Jumia Nigeria', address: '123 E-commerce Rd, Lagos', email: 'adaeze.okoro@jumia.com', phone: '(555) 201-1122' },
        items: [
            { id: 1, description: 'Delivery for Route #R-5834', units: 1, price: 106250 },
            { id: 2, description: 'Delivery for Route #R-5836', units: 1, price: 118750 },
        ],
        notes: 'Thank you for your business.',
        paymentDetails: { method: 'EFT Bank Transfer', accountName: 'Your Company', code: '123456', accountNumber: '987654321' },
        status: 'Sent',
    },
    {
        id: '#INV-002',
        project: 'Konga Deliveries - Sept',
        issuedDate: 'Sep 30, 2025',
        dueDate: 'Oct 15, 2025',
        from: { name: 'Your Company', address: '123 Logistics Lane', email: 'billing@logistics.com', phone: '(555) 123-4567' },
        to: { name: 'Konga Inc.', address: '456 Marketplace Ave, Abuja', email: 'babatunde@konga.com', phone: '(555) 202-3344' },
        items: [
            { id: 1, description: 'Delivery for Route #R-5837', units: 1, price: 187500 },
            { id: 2, description: 'Delivery for Route #R-5840', units: 1, price: 137500 },
        ],
        notes: '',
        paymentDetails: { method: 'EFT Bank Transfer', accountName: 'Your Company', code: '123456', accountNumber: '987654321' },
        status: 'Paid',
    },
     {
        id: '#INV-003',
        project: 'Jumia Deliveries - Aug',
        issuedDate: 'Sep 1, 2025',
        dueDate: 'Sep 16, 2025',
        from: { name: 'Your Company', address: '123 Logistics Lane', email: 'billing@logistics.com', phone: '(555) 123-4567' },
        to: { name: 'Jumia Nigeria', address: '123 E-commerce Rd, Lagos', email: 'adaeze.okoro@jumia.com', phone: '(555) 201-1122' },
        items: [
            { id: 1, description: 'Delivery for Route #R-5839', units: 1, price: 312500 },
        ],
        notes: 'Thank you for your business.',
        paymentDetails: { method: 'EFT Bank Transfer', accountName: 'Your Company', code: '123456', accountNumber: '987654321' },
        status: 'Paid',
    },
];

const initialNotifications: Notification[] = [
    { id: 1, icon: 'ArchiveBoxIcon', iconBg: 'bg-blue-100', title: 'New Order #SHIP-F29GCU', description: 'A new shipment has been created and is pending assignment.', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), type: 'Order', read: false },
    { id: 2, icon: 'UserPlusIcon', iconBg: 'bg-green-100', title: 'Driver Onboarded', description: 'Driver Tunde Adekunle has completed onboarding.', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), type: 'Driver', read: false },
    { id: 3, icon: 'TruckIcon', iconBg: 'bg-orange-100', title: 'Vehicle Maintenance Due', description: 'Vehicle APP-456-XY is due for service next week.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: 'Vehicle', read: true },
    { id: 4, icon: 'Cog8ToothIcon', iconBg: 'bg-gray-100', title: 'System Update Scheduled', description: 'A system update is scheduled for this Sunday at 2 AM.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), type: 'System', read: true },
    { id: 5, icon: 'ExclamationCircleIcon', iconBg: 'bg-red-100', title: 'Delivery Failed', description: 'Stop #STOP-002B for shipment #SHIP-A82B3D failed.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'Order', read: true },
];

const initialDeliveryContacts: DeliveryContact[] = [
    { id: 'DC01', name: 'Home Office', recipientName: 'Alice Johnson', address: '123 Tech Avenue, San Francisco, CA 94107', phone: '555-0101' },
    { id: 'DC02', name: 'Austin Warehouse', recipientName: 'John Smith', address: '456 Innovation Drive, Austin, TX 78701', phone: '555-0102' },
    { id: 'DC03', name: 'Philly Drop-off', recipientName: 'Bob Williams', address: '789 Market Street, Philadelphia, PA 19106', phone: '555-0103' },
];

const initialMaterials: Material[] = [
    { id: 'MAT-001', name: 'Industrial Machine Parts', description: 'Heavy duty parts for manufacturing.', defaultUom: 'crates' },
    { id: 'MAT-002', name: 'Server Racks', description: '42U server racks for data centers.', defaultUom: 'units' },
    { id: 'MAT-003', name: 'Office Furniture', description: 'Desks, chairs, and cabinets.', defaultUom: 'pieces' },
    { id: 'MAT-004', name: 'Electronic Components', description: 'Resistors, capacitors, and microchips.', defaultUom: 'boxes' },
    { id: 'MAT-005', name: 'Retail Goods', description: 'Assorted goods for retail stores.', defaultUom: 'pallets' },
];

const initialPayrollRuns: PayrollRun[] = [
    {
        id: 'PR-2025-09',
        periodStart: '2025-09-01',
        periodEnd: '2025-09-30',
        payDate: '2025-10-05',
        status: 'Paid',
        payslips: [], // Will be generated dynamically
    },
    {
        id: 'PR-2025-08',
        periodStart: '2025-08-01',
        periodEnd: '2025-08-31',
        payDate: '2025-09-05',
        status: 'Processed',
        payslips: [], // Will be generated dynamically
    },
];

export const generateDriverPerformanceData = (drivers: Driver[]): DriverPerformanceData[] => {
    const data: DriverPerformanceData[] = [];
    const today = new Date();
    drivers.forEach(driver => {
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const completedRoutes = Math.floor(Math.random() * 3) + 1;
            const totalDeliveries = completedRoutes * (Math.floor(Math.random() * 5) + 5);
            const onTimeDeliveries = Math.floor(totalDeliveries * (Math.random() * 0.1 + 0.9));
            const distanceKm = completedRoutes * (Math.floor(Math.random() * 50) + 70);

            data.push({
                driverId: driver.id,
                date: dateString,
                completedRoutes,
                totalDeliveries,
                onTimeDeliveries,
                distanceKm,
            });
        }
    });
    return data;
};

export const subscriptionData: Record<string, SubscriptionPlan[]> = {
  individual: [
    { key: 'trial', price: 0, isPopular: false, limits: { vehicles: 1, drivers: 1, routes: 1, clients: 1 } },
    { key: 'basic', price: 13500, isPopular: false },
    { key: 'plus', price: 43500, isPopular: true },
    { key: 'premium', price: 88500, isPopular: false },
  ],
  business: [
    { key: 'trial', price: 0, isPopular: false, limits: { vehicles: 1, drivers: 1, routes: 1, clients: 1 } },
    { key: 'starter', price: 148500, isPopular: false },
    { key: 'growth', price: 373500, isPopular: true },
    { key: 'scale', price: 748500, isPopular: false },
  ],
  partner: [
    {
      key: 'trial',
      price: 0,
      isPopular: false,
      limits: {
        vehicles: 1,
        drivers: 1,
        routes: 1,  // per month
        clients: 1
      }
    },
    {
      key: 'basic',
      price: 1000,
      isPopular: false,
      limits: {
        vehicles: 3,
        drivers: 3,
        routes: 10,  // per month
        clients: 5
      }
    },
    {
      key: 'pro',
      price: 298500,
      isPopular: true,
      limits: {
        vehicles: 15,
        drivers: 15,
        routes: 50,  // per month
        clients: 25
      }
    },
    {
      key: 'max',
      price: 598500,
      isPopular: false,
      limits: {
        vehicles: -1,  // unlimited
        drivers: -1,   // unlimited
        routes: -1,    // unlimited
        clients: -1    // unlimited
      }
    },
  ],
};
// --- END OF MOCK DATA ---

// Helper to simulate network delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- EXPORTED MOCK DATA FETCHING FUNCTIONS ---
export const getTransporters = async () => { await sleep(200); return initialTransporters; };
export const getShipments = async () => { await sleep(200); return initialShipments; };
export const getProducts = async () => { await sleep(200); return initialProducts; };
export const getVisits = async () => { await sleep(200); return initialVisits; };
export const getDrivers = async () => { await sleep(200); return initialDrivers; };
export const getVehicles = async () => { await sleep(200); return initialVehicles; };
export const getClients = async () => { await sleep(200); return initialClients; };
export const getRoutes = async () => { await sleep(200); return initialRoutes; };
export const getInvoices = async () => { await sleep(200); return initialInvoices; };
export const getNotifications = async () => { await sleep(200); return initialNotifications; };
export const getDeliveryContacts = async () => { await sleep(200); return initialDeliveryContacts; };
export const getMaterials = async () => { await sleep(200); return initialMaterials; };
export const getPayrollRuns = async () => { await sleep(200); return initialPayrollRuns; };

// --- PAYROLL CALCULATION LOGIC ---

/**
 * Calculates PAYE tax based on the proposed 2026 Nigerian tax reform.
 * @param annualGrossIncome - The total annual gross income.
 * @param pensionContribution - The total annual pension contribution.
 * @param nhfContribution - The total annual National Housing Fund contribution.
 * @returns The calculated annual tax.
 */
const calculateNigerianPAYE = (annualGrossIncome: number, pensionContribution: number, nhfContribution: number): number => {
    // 1. Calculate Consolidated Relief Allowance (CRA)
    const cra = 200000 + (0.20 * annualGrossIncome);

    // 2. Determine Total Reliefs
    const totalReliefs = cra + pensionContribution + nhfContribution;

    // 3. Calculate Taxable Income
    let taxableIncome = annualGrossIncome - totalReliefs;
    if (taxableIncome <= 0) {
        return Math.max(0.01 * annualGrossIncome, 0); // Minimum tax is 1% of gross income
    }

    // 4. Apply Tax Brackets (Proposed Annual)
    let tax = 0;
    
    if (taxableIncome > 20000000) {
        tax += (taxableIncome - 20000000) * 0.35;
        taxableIncome = 20000000;
    }
    if (taxableIncome > 12000000) {
        tax += (taxableIncome - 12000000) * 0.30;
        taxableIncome = 12000000;
    }
    if (taxableIncome > 8000000) {
        tax += (taxableIncome - 8000000) * 0.25;
        taxableIncome = 8000000;
    }
    if (taxableIncome > 4000000) {
        tax += (taxableIncome - 4000000) * 0.20;
        taxableIncome = 4000000;
    }
    if (taxableIncome > 2000000) {
        tax += (taxableIncome - 2000000) * 0.15;
        taxableIncome = 2000000;
    }
    if (taxableIncome > 0) {
        tax += taxableIncome * 0.10;
    }

    // 5. Apply Minimum Tax Rule
    const minimumTax = 0.01 * annualGrossIncome;
    return Math.max(tax, minimumTax);
};


export const calculatePayslipsForPeriod = async (drivers: Driver[], periodStart: string, periodEnd: string): Promise<Payslip[]> => {
    await sleep(300); // simulate async work
    const payPeriodDate = new Date(periodStart);
    const payPeriod = `${payPeriodDate.toLocaleString('default', { month: 'short' })} ${payPeriodDate.getFullYear()}`;
    const payDate = new Date(new Date(periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const payslips: Payslip[] = drivers.map(driver => {
        // Assume baseSalary is annual. Calculate monthly figures.
        // Use default values if fields are missing
        const annualGross = driver.baseSalary || 0;
        const pensionRate = driver.pensionContributionRate || 8;
        const nhfRate = driver.nhfContributionRate || 2.5;

        const monthlyBasePay = annualGross / 12;
        const bonuses = Math.random() > 0.5 ? Math.round(Math.random() * (monthlyBasePay * 0.1)) : 0; // Random bonus up to 10%
        const monthlyGrossPay = monthlyBasePay + bonuses;

        // Calculate annual deductions for tax calculation
        const annualPension = annualGross * (pensionRate / 100);
        const annualNhf = annualGross * (nhfRate / 100);
        
        // Calculate annual tax using the dedicated function
        const annualTax = calculateNigerianPAYE(annualGross, annualPension, annualNhf);

        // Convert annual deductions back to monthly for the payslip
        const monthlyTax = annualTax / 12;
        const monthlyPension = annualPension / 12;
        const monthlyNhf = annualNhf / 12;

        const netPay = monthlyGrossPay - monthlyTax - monthlyPension - monthlyNhf;

        return {
            id: `PS-${driver.id}-${Date.now()}`,
            driverId: driver.id,
            driverName: driver.name,
            payPeriod,
            payDate,
            basePay: Math.round(monthlyBasePay),
            bonuses: Math.round(bonuses),
            grossPay: Math.round(monthlyGrossPay),
            tax: Math.round(monthlyTax),
            pension: Math.round(monthlyPension),
            nhf: Math.round(monthlyNhf),
            netPay: Math.round(netPay),
            status: 'Draft',
        };
    });

    return payslips;
};