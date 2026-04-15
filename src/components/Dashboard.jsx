import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { CheckCircle, AlertCircle, MapPin, Package, Download } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard({ stats, onNavigate, onExport }) {
  const pieData = {
    labels: ['Sesuai', 'Tidak Sesuai'],
    datasets: [
      {
        data: [stats.matchingItems, stats.nonMatchingItems],
        backgroundColor: ['#10B981', '#EF4444'],
        hoverBackgroundColor: ['#059669', '#DC2626'],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: ['Checked', 'Remaining'],
    datasets: [
      {
        label: 'Locations',
        data: [stats.completedLocations, stats.remainingLocations],
        backgroundColor: ['#4F46E5', '#E5E7EB'],
      },
    ],
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2>Dashboard Analytics</h2>
        <button className="btn btn-outline" style={{ borderColor: '#10B981', color: '#10B981' }} onClick={onExport}>
          <Download size={18} className="mr-2" /> Export to Excel
        </button>
      </div>

      <div className="grid-stats">
        <div className="card">
          <div className="flex-between mb-4">
            <h3 className="text-muted">Total Locations</h3>
            <MapPin size={24} color="var(--primary)" />
          </div>
          <h1>{stats.totalLocations}</h1>
        </div>
        
        <div className="card">
          <div className="flex-between mb-4">
            <h3 className="text-muted">Completed</h3>
            <CheckCircle size={24} color="var(--secondary)" />
          </div>
          <h1>{stats.completedLocations}</h1>
        </div>

        <div className="card">
          <div className="flex-between mb-4">
            <h3 className="text-muted">Total Items Checked</h3>
            <Package size={24} color="var(--primary)" />
          </div>
          <h1>{stats.totalItemsChecked}</h1>
        </div>
        
        <div className="card">
          <div className="flex-between mb-4">
            <h3 className="text-muted">Item Discrepancy</h3>
            <AlertCircle size={24} color="var(--danger)" />
          </div>
          <h1>{stats.nonMatchingItems}</h1>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card">
          <h3 className="mb-4">Item Status (Sesuai vs Tidak Sesuai)</h3>
          {stats.totalItemsChecked === 0 ? (
            <div className="text-center text-muted" style={{ padding: '2rem 0' }}>No items checked yet.</div>
          ) : (
            <div style={{ maxWidth: '300px', margin: '0 auto' }}>
              <Pie data={pieData} />
            </div>
          )}
        </div>
        
        <div className="card">
          <h3 className="mb-4">Location Completion Progress</h3>
          <div style={{ height: '300px' }}>
            <Bar 
              data={barData} 
              options={{ maintainAspectRatio: false, responsive: true }}
            />
          </div>
        </div>
      </div>
      
      <div className="text-center mt-4">
        <button className="btn btn-primary" onClick={() => onNavigate('locations')}>
           Start Filling Checklist <MapPin className="ml-2" size={18} />
        </button>
      </div>
    </div>
  );
}
