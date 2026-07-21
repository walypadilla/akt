// frontend/src/context/DashboardContext.jsx
import React, { createContext, useState, useContext } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshDashboard = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardContext.Provider value={{ refreshDashboard, refreshKey }}>
      {children}
    </DashboardContext.Provider>
  );
};