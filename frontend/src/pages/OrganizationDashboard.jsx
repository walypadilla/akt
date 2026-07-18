import React, { useEffect, useState } from 'react';
import { getOrganizationKPIs, getMonthlyData, getTopClients } from '../api/organizationDashboard';
import KPICards from '../components/KPICards';
import MonthlyChart from '../components/MonthlyChart';
import TopClientsTable from '../components/TopClientsTable';

const OrganizationDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisData, monthlyData, clientsData] = await Promise.all([
          getOrganizationKPIs(),
          getMonthlyData(),
          getTopClients()
        ]);
        setKpis(kpisData);
        setMonthly(monthlyData);
        setTopClients(clientsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando dashboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard de mi organización</h1>
      <KPICards kpis={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <MonthlyChart data={monthly} />
        <TopClientsTable clients={topClients} />
      </div>
    </div>
  );
};

export default OrganizationDashboard;