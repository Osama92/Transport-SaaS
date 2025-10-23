import React from 'react';
import IndividualDashboard from './dashboards/IndividualDashboard';
import BusinessDashboard from './dashboards/BusinessDashboard';
import PartnerDashboard from './dashboards/PartnerDashboard';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  role: string;
  onSubscribeClick?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, onSubscribeClick }) => {
  const { logOut } = useAuth();

  const renderDashboardByRole = () => {
    switch (role) {
      case 'individual':
        return <IndividualDashboard onLogout={logOut} role={role} onSubscribeClick={onSubscribeClick} />;
      case 'business':
        return <BusinessDashboard onLogout={logOut} role={role} onSubscribeClick={onSubscribeClick} />;
      case 'partner':
        return <PartnerDashboard onLogout={logOut} role={role} onSubscribeClick={onSubscribeClick} />;
      default:
        // Fallback to business dashboard if role is unknown or not set
        return <BusinessDashboard onLogout={logOut} role={role} onSubscribeClick={onSubscribeClick} />;
    }
  };

  return <>{renderDashboardByRole()}</>;
};

export default Dashboard;