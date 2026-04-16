import React, { useState } from 'react';
import { Map, ChevronRight, CheckCircle } from 'lucide-react';

export default function LocationList({ locations, onSelectLocation, onBack }) {
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'

  const filteredLocations = locations.filter(loc => {
    if (filter === 'completed') return loc.isCompleted;
    if (filter === 'pending') return !loc.isCompleted;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2>Select Location Base</h2>
        <button className="btn btn-outline" onClick={onBack}>Back to Dashboard</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px' }}
          onClick={() => setFilter('all')}
        >
          Semua Lokasi
        </button>
        <button 
          className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px' }}
          onClick={() => setFilter('completed')}
        >
          Selesai (Completed)
        </button>
        <button 
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px' }}
          onClick={() => setFilter('pending')}
        >
          Belum Selesai (Pending)
        </button>
      </div>
      
      <div className="grid-locations">
        {filteredLocations.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            <p className="text-muted">Tidak ada lokasi yang cocok dengan filter yang dipilih.</p>
          </div>
        ) : filteredLocations.map((loc) => (
          <div 
            key={loc.id} 
            className="card card-hoverable" 
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectLocation(loc)}
          >
            <div className="flex-between mb-4">
              <span className={`status-badge ${loc.isCompleted ? 'status-completed' : 'status-pending'}`}>
                {loc.isCompleted ? 'Completed' : 'Pending'}
              </span>
              <Map size={20} className="text-muted" />
            </div>
            <h3 style={{ marginBottom: '0.25rem' }}>{loc.name}</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              {loc.id} • {loc.address}
            </p>
            
            <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: loc.isCompleted ? 'var(--secondary)' : 'var(--primary)' }}>
                {loc.isCompleted ? 'View Data' : 'Fill Checklist'}
              </span>
              {loc.isCompleted ? (
                <CheckCircle size={18} color="var(--secondary)" />
              ) : (
                <ChevronRight size={18} color="var(--primary)" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
