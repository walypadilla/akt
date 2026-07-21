// frontend/src/components/wrappers/FacturasEmitidasWrapper.jsx
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import FacturasEmitidas from '../../pages/superadmin/FacturasEmitidas';

const FacturasEmitidasWrapper = () => {
  const { refreshDashboard } = useDashboard();
  return <FacturasEmitidas onDashboardUpdate={refreshDashboard} />;
};

export default FacturasEmitidasWrapper;