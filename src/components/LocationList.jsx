import React from 'react';
import { Map, ChevronRight, CheckCircle } from 'lucide-react';

export default function LocationList({ locations, onSelectLocation, onBack }) {
  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2>Select Location Base</h2>
        <button className="btn btn-outline" onClick={onBack}>Back to Dashboard</button>
      </div>
      
      <div className="grid-locations">
        {locations.map((loc) => (
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
