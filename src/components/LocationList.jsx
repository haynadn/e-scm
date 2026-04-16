import React, { useState } from 'react';
import { Map, ChevronRight, CheckCircle, Search, Edit2, Check, X } from 'lucide-react';

export default function LocationList({ locations, onSelectLocation, onBack, onUpdateLocationName }) {
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const filteredLocations = locations.filter(loc => {
    const matchesFilter = filter === 'all' || 
                          (filter === 'completed' && loc.isCompleted) || 
                          (filter === 'pending' && !loc.isCompleted);
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loc.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleEditClick = (e, loc) => {
    e.stopPropagation();
    setEditingId(loc.id);
    setEditName(loc.name);
  };

  const handleSaveEdit = async (e, locId) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    const success = await onUpdateLocationName(locId, editName);
    if (success) {
      setEditingId(null);
    } else {
      alert("Gagal menyimpan nama lokasi ke server.");
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2>Select Location Base</h2>
        <button className="btn btn-outline" onClick={onBack}>Back to Dashboard</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', top: '0.75rem', left: '1rem', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Cari nama lokasi atau ID..." 
            style={{ paddingLeft: '2.5rem', borderRadius: '20px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
            <div style={{ marginBottom: '0.25rem', position: 'relative' }}>
              {editingId === loc.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus
                    className="form-control" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '1rem', fontWeight: 600 }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(e, loc.id);
                      if (e.key === 'Escape') handleCancelEdit(e);
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn-icon" style={{ padding: '0.25rem', color: 'var(--secondary)', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={(e) => handleSaveEdit(e, loc.id)}>
                      <Check size={20} />
                    </button>
                    <button className="btn-icon" style={{ padding: '0.25rem', color: 'var(--danger)', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={handleCancelEdit}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, paddingRight: '0.5rem' }}>{loc.name}</h3>
                  <button 
                    className="btn-icon" 
                    style={{ padding: '0.25rem', opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }} 
                    onClick={(e) => handleEditClick(e, loc)}
                    title="Edit Nama Lokasi"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>
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
