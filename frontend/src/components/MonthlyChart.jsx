import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-4">No hay datos mensuales</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Ingresos vs Gastos por Mes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="ingresos" fill="#8884d8" name="Ingresos" />
          <Bar dataKey="gastos" fill="#82ca9d" name="Gastos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyChart;