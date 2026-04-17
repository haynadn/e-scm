import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  CheckCircle, AlertCircle, MapPin, Package, Download, X, Search, 
  Filter, TrendingUp, Clock, Activity, ArrowRight 
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard({ stats, onNavigate, onExport, locations = [], checklists = {}, masterItems = [], role, session }) {
  const [activeModal, setActiveModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recentLogs, setRecentLogs] = useState([]);

  // Fetch recent activity logs (filtered by backend for surveyors)
  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
        const res = await fetch(`${BASE_URL}/logs`, {
          headers: { 'Authorization': `Bearer ${session.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRecentLogs(data.slice(0, 5)); // Only show last 5
        }
      } catch (err) {
        console.error('Failed to fetch dashboard logs:', err);
      }
    };
    if (session?.token) fetchRecentLogs();
  }, [session]);

  // Derived Stats
  const completionRate = stats.totalLocations > 0 
    ? Math.round((stats.completedLocations / stats.totalLocations) * 100) 
    : 0;

  const topProblems = masterItems.map(item => {
    const b = stats.itemConditionBreakdown?.[item.id] || { 'Bagus': 0, 'Rusak Ringan': 0, 'Rusak Berat': 0, 'Hilang': 0 };
    const issueCount = (b['Rusak Ringan'] || 0) + (b['Rusak Berat'] || 0) + (b['Hilang'] || 0);
    return { ...item, issueCount };
  })
  .filter(item => item.issueCount > 0)
  .sort((a, b) => b.issueCount - a.issueCount)
  .slice(0, 5);

  // Chart Data
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

  const conditionData = {
    labels: ['Bagus', 'Rusak Ringan', 'Rusak Berat', 'Hilang'],
    datasets: [
      {
        label: 'Kondisi Barang',
        data: [
          stats.conditionStats?.bagus || 0,
          stats.conditionStats?.rusakRingan || 0,
          stats.conditionStats?.rusakBerat || 0,
          stats.conditionStats?.hilang || 0
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
      },
    ],
  };

  return (
    <div className="animate-fade-in">
      {/* Header section */}
      <div className="flex-between mb-4">
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Management Dashboard</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Real-time inventory and condition tracking overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {role !== 'viewer' && (
            <button className="btn btn-primary" onClick={() => onNavigate('locations')}>
              <MapPin size={18} className="mr-2" /> Start Filling
            </button>
          )}
          <button className="btn btn-outline" onClick={onExport}>
            <Download size={18} className="mr-2" /> Export report
          </button>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Global Progress Card */}
        <div className="card shadow-md" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem', background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', color: 'white', border: 'none' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
             <svg width="100" height="100" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
               <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8" strokeDasharray={`${completionRate * 2.82} 282`} strokeLinecap="round" transform="rotate(-90 50 50)" />
               <text x="50" y="55" fontSize="20" fontWeight="800" textAnchor="middle" fill="white">{completionRate}%</text>
             </svg>
          </div>
          <div>
            <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Progress</h3>
            <h1 style={{ margin: '0.25rem 0', fontSize: '2.5rem' }}>{stats.completedLocations} / {stats.totalLocations}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Locations 100% Completed</p>
          </div>
        </div>

        {/* Quick Insight Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card shadow-sm card-hoverable" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setActiveModal('checked')}>
             <div className="flex-between mb-2">
               <Package size={20} color="var(--primary)" />
               <span style={{ fontSize: '0.7rem', color: '#059669', background: '#D1FAE5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>+{stats.matchingItems} OK</span>
             </div>
             <div className="text-muted" style={{ fontSize: '0.8rem' }}>Items Checked</div>
             <h2 style={{ margin: 0 }}>{stats.totalItemsChecked}</h2>
          </div>
          <div className="card shadow-sm card-hoverable" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setActiveModal('discrepancy')}>
             <div className="flex-between mb-2">
               <AlertCircle size={20} color="var(--danger)" />
               <TrendingUp size={16} color="var(--danger)" />
             </div>
             <div className="text-muted" style={{ fontSize: '0.8rem' }}>Discrepancies</div>
             <h2 style={{ margin: 0, color: 'var(--danger)' }}>{stats.nonMatchingItems}</h2>
          </div>
          <div className="card shadow-sm" style={{ padding: '1.25rem', gridColumn: 'span 2' }}>
             <div className="flex-between mb-2">
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Activity Trend</span>
                <Activity size={16} color="var(--secondary)" />
             </div>
             <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '35px' }}>
                {[30, 45, 25, 60, 75, 40, 85, 30, 50, 65].map((h, i) => (
                  <div key={i} style={{ flex: 1, backgroundColor: 'var(--primary)', height: `${h}%`, borderRadius: '2px', opacity: 0.3 + (i * 0.07) }}></div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Primary Insights Grid */}
      <div className="grid-stats mb-6" style={{ marginBottom: '1.5rem' }}>
        {/* Top Mismatched Locations */}
        <div className="card shadow-sm">
          <h3 className="mb-4 flex items-center"><AlertCircle size={18} className="mr-2" color="var(--danger)" /> High Discrepancy Areas</h3>
          {stats.topMismatchedLocations?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.topMismatchedLocations.map(loc => (
                <div key={loc.id} className="flex-between" style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{loc.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>ID: {loc.id}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '1.1rem' }}>{loc.mismatchCount}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Diff. Items</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">All locations are consistent.</div>
          )}
        </div>

        {/* Top Issue Items */}
        <div className="card shadow-sm">
          <h3 className="mb-4 flex items-center"><TrendingUp size={18} className="mr-2" color="var(--primary)" /> Top Attention Items</h3>
          {topProblems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topProblems.map(item => (
                <div key={item.id} className="flex-between" style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>ID: {item.id}</div>
                  </div>
                  <div style={{ backgroundColor: '#EF4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {item.issueCount} Issues
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">All items in good condition.</div>
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="card shadow-sm">
          <h3 className="mb-4 flex items-center">
            <Clock size={18} className="mr-2" color="#6B7280" /> 
            {role === 'administrator' ? 'System Activity Feed' : 'My Recent Activity'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentLogs.length > 0 ? (
              <>
                {recentLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: '0.75rem', position: 'relative', paddingLeft: '1rem' }}>
                    <div style={{ width: '2px', height: '100%', backgroundColor: '#E5E7EB', position: 'absolute', left: 0, top: '4px' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', position: 'absolute', left: '-3px', top: '5px' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="flex-between">
                         <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.username}</span>
                         <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>{log.action.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.details}</div>
                    </div>
                  </div>
                ))}
                <button className="btn btn-outline w-full" style={{ padding: '0.4rem', fontSize: '0.75rem', marginTop: '0.5rem' }} onClick={() => onNavigate('logs')}>
                  View Full History <ArrowRight size={12} className="ml-1" />
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-muted">No recent activity.</div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid-stats mb-6" style={{ marginBottom: '1.5rem' }}>
        <div className="card shadow-sm">
          <h3 className="mb-4">Item Status Comparison</h3>
          {stats.totalItemsChecked === 0 ? (
            <div className="text-center text-muted" style={{ padding: '2rem 0' }}>No items checked yet.</div>
          ) : (
            <div style={{ maxWidth: '280px', margin: '0 auto' }}>
              <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
            </div>
          )}
        </div>
        
        <div className="card shadow-sm">
          <h3 className="mb-4">Location Completion</h3>
          <div style={{ height: '250px' }}>
            <Bar 
              data={barData} 
              options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>

        <div className="card shadow-sm">
          <h3 className="mb-4">Global Condition Stats</h3>
          <div style={{ height: '250px' }}>
            <Bar 
              data={conditionData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                plugins: { legend: { display: false } }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Item Detail Breakdown Section */}
      <div className="card shadow-sm mt-4">
        <div className="flex-between mb-4 flex-wrap" style={{ gap: '1rem' }}>
          <h3>Item Condition Breakdown Detail</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Cari item..." 
                style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ position: 'relative', width: '180px' }}>
              <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <select 
                className="form-control" 
                style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Semua Barang</option>
                <option value="issues">Bermasalah Saja</option>
                <option value="bagus">Bagus Saja</option>
                <option value="rusak">Rusak (Rgn/Brt)</option>
                <option value="hilang">Hilang Saja</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Nama Item</th>
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#ECFDF5', color: '#065F46' }}>Bagus</th>
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#FFFBEB', color: '#92400E' }}>Rusak Rgn.</th>
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#FEF2F2', color: '#991B1B' }}>Rusak Brt.</th>
                <th style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#F9FAFB', color: '#4B5563' }}>Hilang</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = masterItems.filter(item => {
                  const nameMatch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                  const idMatch = (item.id || '').toLowerCase().includes(searchTerm.toLowerCase());
                  if (!nameMatch && !idMatch) return false;

                  const b = stats.itemConditionBreakdown?.[item.id] || { 'Bagus': 0, 'Rusak Ringan': 0, 'Rusak Berat': 0, 'Hilang': 0 };
                  const hasIssues = (b['Rusak Ringan'] || 0) + (b['Rusak Berat'] || 0) + (b['Hilang'] || 0) > 0;
                  const hasDamage = (b['Rusak Ringan'] || 0) + (b['Rusak Berat'] || 0) > 0;
                  const hasMissing = (b['Hilang'] || 0) > 0;
                  const hasBagus = (b['Bagus'] || 0) > 0;

                  if (statusFilter === 'issues') return hasIssues;
                  if (statusFilter === 'bagus') return hasBagus && !hasIssues;
                  if (statusFilter === 'rusak') return hasDamage;
                  if (statusFilter === 'hilang') return hasMissing;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Tidak ada item yang sesuai dengan filter.
                      </td>
                    </tr>
                  );
                }

                return filtered.map(item => {
                  const breakdown = stats.itemConditionBreakdown?.[item.id] || { 'Bagus': 0, 'Rusak Ringan': 0, 'Rusak Berat': 0, 'Hilang': 0 };
                  const total = (breakdown['Bagus'] || 0) + (breakdown['Rusak Ringan'] || 0) + (breakdown['Rusak Berat'] || 0) + (breakdown['Hilang'] || 0);
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {item.id}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500, color: '#059669' }}>{breakdown['Bagus'] || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500, color: '#D97706' }}>{breakdown['Rusak Ringan'] || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500, color: '#DC2626' }}>{breakdown['Rusak Berat'] || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500, color: '#4B5563' }}>{breakdown['Hilang'] || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700 }}>{total || '-'}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
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
