import React, { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { CheckCircle, AlertCircle, MapPin, Package, Download, X } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard({ stats, onNavigate, onExport, locations = [], checklists = {}, masterItems = [] }) {
  const [activeModal, setActiveModal] = useState(null);
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
        
        <div className="card card-hoverable" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('completed')}>
          <div className="flex-between mb-4">
            <h3 className="text-muted">Completed</h3>
            <CheckCircle size={24} color="var(--secondary)" />
          </div>
          <h1>{stats.completedLocations}</h1>
        </div>

        <div className="card card-hoverable" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('checked')}>
          <div className="flex-between mb-4">
            <h3 className="text-muted">Total Items Checked</h3>
            <Package size={24} color="var(--primary)" />
          </div>
          <h1>{stats.totalItemsChecked}</h1>
        </div>
        
        <div className="card card-hoverable" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('discrepancy')}>
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

      {activeModal && (
        <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>
                {activeModal === 'completed' && <CheckCircle size={20} color="var(--secondary)" />}
                {activeModal === 'checked' && <Package size={20} color="var(--primary)" />}
                {activeModal === 'discrepancy' && <AlertCircle size={20} color="var(--danger)" />}
                {activeModal === 'completed' ? 'Lokasi Selesai (Completed)' : activeModal === 'checked' ? 'Detail Item Diperiksa' : 'Daftar Ketidaksesuaian (Discrepancy)'}
              </h2>
              <button className="btn-icon" onClick={() => setActiveModal(null)} style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {activeModal === 'completed' && (
                      <>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>ID Lokasi</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Nama Lokasi</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Alamat</th>
                      </>
                    )}
                    {activeModal !== 'completed' && (
                      <>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Nama Lokasi</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Item</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Std. Qty</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Aktual</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Kondisi</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let rows = [];
                    if (activeModal === 'completed') {
                      locations.filter(l => l.isCompleted).forEach(loc => {
                        rows.push(
                          <tr key={loc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem' }}>{loc.id}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{loc.name}</td>
                            <td style={{ padding: '0.75rem' }}>{loc.address || '-'}</td>
                          </tr>
                        );
                      });
                    } else {
                      // checked or discrepancy
                      locations.forEach(loc => {
                        const locChecklist = checklists[loc.id] || [];
                        locChecklist.forEach(chk => {
                          const isFilled = chk.jumlahAktual !== null && chk.jumlahAktual !== '' && chk.jumlahAktual !== undefined;
                          if (!isFilled) return;
                          
                          const master = masterItems.find(m => m.id === chk.idItem);
                          const isDiscrepancy = master && parseInt(chk.jumlahAktual) !== parseInt(master.standardQty);
                          
                          if (activeModal === 'discrepancy' && !isDiscrepancy) return;

                          rows.push(
                            <tr key={`${loc.id}-${chk.idItem}`} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '0.75rem' }}>{loc.name}</td>
                              <td style={{ padding: '0.75rem', fontWeight: 500 }}>{master ? master.name : chk.idItem}</td>
                              <td style={{ padding: '0.75rem' }}>{master ? master.standardQty : '-'}</td>
                              <td style={{ padding: '0.75rem', color: isDiscrepancy ? 'var(--danger)' : 'var(--text)' }}>
                                <strong>{chk.jumlahAktual}</strong>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', background: chk.kondisi === 'Bagus' ? '#D1FAE5' : '#FEE2E2', color: chk.kondisi === 'Bagus' ? '#065F46' : '#991B1B' }}>
                                  {chk.kondisi}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      });
                    }
                    
                    if (rows.length === 0) {
                      return <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data.</td></tr>;
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', textAlign: 'right', backgroundColor: '#FAFAFA' }}>
              <button className="btn btn-outline" onClick={() => setActiveModal(null)}>Tutup Rincian</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
