# Transport SaaS Dashboard

A comprehensive and visually appealing dashboard for a transport and logistics SaaS application. It provides at-a-glance statistics, analytics, delivery tracking, and product management.

## Features

- 🚚 Fleet Management & Tracking
- 📦 Shipment Management
- 👥 Driver Management
- 📊 Analytics & Reporting
- 💰 Payroll Management
- 📱 Multi-language Support (English, Hausa, Igbo, Yoruba)
- 🔐 Firebase Authentication
- 🗺️ Real-time GPS Tracking with Leaflet Maps

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Authentication:** Firebase Auth
- **Database:** Firebase Firestore (with mock data fallback)
- **Maps:** Leaflet + React-Leaflet
- **Charts:** Recharts
- **PDF Generation:** jsPDF + html2canvas
- **Internationalization:** i18next

## Database Architecture

The app uses **organization-based multi-tenancy** with Firestore:
- All data scoped to `organizationId` for data isolation
- Real-time updates via Firestore listeners
- Composite indexes for complex queries
- Security rules enforce tenant isolation

**Documentation**:
- [Firestore Setup Guide](FIRESTORE_SETUP.md) - Complete deployment instructions
- [Migration Summary](FIRESTORE_MIGRATION_SUMMARY.md) - Architecture decisions and examples
- [Developer Guide](CLAUDE.md) - Code architecture and patterns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (for authentication and database)

### Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase configuration

4. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

### Running Locally

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
Transport SaaS/
├── api/              # API integration layer
├── components/       # React components
│   ├── modals/      # Modal components
│   ├── payslip/     # Payroll components
│   └── screens/     # Screen/page components
├── contexts/         # React contexts (Auth, etc.)
├── data/            # Mock data and data utilities
├── firebase/        # Firebase configuration
├── locales/         # i18n translation files
├── src/             # CSS and assets
├── App.tsx          # Main app component
├── i18n.ts          # i18n configuration
├── index.tsx        # App entry point
└── types.ts         # TypeScript type definitions
```

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.
