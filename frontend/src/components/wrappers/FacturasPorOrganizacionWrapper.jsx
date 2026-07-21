// frontend/src/components/wrappers/FacturasPorOrganizacionWrapper.jsx
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import FacturasPorOrganizacion from '../../pages/superadmin/FacturasPorOrganizacion';

const FacturasPorOrganizacionWrapper = () => {
  const { refreshDashboard } = useDashboard();
  return <FacturasPorOrganizacion onDashboardUpdate={refreshDashboard} />;
};

export default FacturasPorOrganizacionWrapper;