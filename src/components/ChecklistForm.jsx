import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Camera, Upload, Trash2, AlertCircle, X } from 'lucide-react';

export default function ChecklistForm({ location, masterItems, savedData, onSave, onBack, role, onRequestReset, onFetchResetStatus }) {
  const isReadOnly = role === 'viewer';
  const [formData, setFormData] = useState({});
  const [address, setAddress] = useState(location.address || '');
  const [activeRequest, setActiveRequest] = useState(null);

  useEffect(() => {
    const checkResetStatus = async () => {
      const status = await onFetchResetStatus(location.id);
      setActiveRequest(status);
      
      // If Admin has approved the reset, but our local data hasn't refreshed yet
      if (status && status.status === 'approved' && savedData && savedData.length > 0) {
        console.log("Detecting approved reset, refreshing data...");
        onRefreshData();
      }
    };
    if (location.id) checkResetStatus();
  }, [location.id, savedData, onFetchResetStatus, onRefreshData]);

  useEffect(() => {
    const initialData = {};
    masterItems.forEach(item => {
      initialData[item.id] = {
        idItem: item.id,
        jumlahAktual: '',
        kondisi: 'Bagus',
        dokumentasi: '', 
        catatan: ''
      };
    });

    if (savedData && savedData.length > 0) {
      savedData.forEach(item => {
        // Only merge if item exists in masterItems to prevent stale data
        if (initialData[item.idItem]) {
          initialData[item.idItem] = item;
        }
      });
    }
    setFormData(initialData);
    setAddress(location.address || '');
  }, [savedData, masterItems, location]);

  const handleInputChange = (idItem, field, value) => {
    setFormData(prev => ({
      ...prev,
      [idItem]: {
        ...prev[idItem],
        [field]: value
      }
    }));
  };

  const handleImageUpload = (idItem, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        handleInputChange(idItem, 'dokumentasi', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = Object.values(formData);
    
    // Calculate if all items are filled (partial save logic)
    const isCompleted = dataToSave.every(item => item.jumlahAktual !== '' && item.jumlahAktual !== null);
    
    onSave(location.id, dataToSave, isCompleted, address);
    onBack(); 
  };

  if (!masterItems || masterItems.length === 0) {
    return (
      <div className="card text-center">
        <h3>Master Items is Empty</h3>
        <p className="text-muted mb-4">Please import your master items before filling the checklist.</p>
        <button className="btn btn-outline" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (Object.keys(formData).length === 0) return <div className="text-center mt-4">Loading Form...</div>;

  return (
    <div className="animate-fade-in">
      <div className="card mb-4" style={{ position: 'sticky', top: '1rem', zIndex: 10 }}>
        <div className="flex-between">
          <div>
            <button className="btn btn-outline" style={{ padding: '0.5rem', marginBottom: '0.5rem' }} onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ display: 'inline-block', marginLeft: '1rem' }}>{location.name} Form</h2>
            <p className="text-muted ml-2" style={{ display: 'inline-block' }}>({location.id})</p>
            {isReadOnly && <span style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>READ ONLY MODE</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {!isReadOnly && (
              <button 
                type="button" 
                className="btn btn-outline-danger" 
                disabled={activeRequest?.status === 'pending'}
                onClick={() => {
                  if (window.confirm(`Minta Administrator untuk menghapus/reset semua data di ${location.name}?`)) {
                    onRequestReset(location.id, location.name).then(() => {
                      // Refresh status after request
                      onFetchResetStatus(location.id).then(setActiveRequest);
                    });
                  }
                }}
              >
                <Trash2 size={18} className="mr-2" /> 
                {activeRequest?.status === 'pending' ? 'Tunggu Approval...' : 'Minta Reset'}
              </button>
            )}
            {!isReadOnly && (
              <button className="btn btn-primary" onClick={handleSubmit}>
                <Save size={18} className="mr-2" /> Save Data
              </button>
            )}
          </div>
        </div>

        {/* Reset Request Status Notification Banner */}
        {activeRequest && activeRequest.status !== 'approved' && (
          <div className={`mt-3 p-3 flex-between`} style={{ 
            borderRadius: '8px', 
            backgroundColor: activeRequest.status === 'pending' ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${activeRequest.status === 'pending' ? '#FEF3C7' : '#FEE2E2'}`,
            color: activeRequest.status === 'pending' ? '#92400E' : '#991B1B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              <div style={{ fontSize: '0.9rem' }}>
                {activeRequest.status === 'pending' ? (
                  <><strong>Permintaan Reset Sedang Diproses:</strong> Menunggu persetujuan dari Administrator.</>
                ) : (
                  <><strong>Permintaan Reset Ditolak:</strong> Admin menolak permintaan pembersihan data untuk lokasi ini.</>
                )}
              </div>
            </div>
            {activeRequest.status === 'rejected' && (
              <button className="btn-icon" onClick={() => setActiveRequest(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Alamat / Deskripsi Tambahan :</label>
          <textarea 
            className="form-control" 
            placeholder="Ketikkan perbaikan/tambahan alamat di sini..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{ minHeight: '60px' }}
            disabled={isReadOnly}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {masterItems.map((item, index) => {
          const currentItemState = formData[item.id] || {};
          return (
            <div key={item.id} className="card checklist-item">
              <div className="checklist-item-header">
                <h4>{index + 1}. {item.name}</h4>
                <div className="flex-between">
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>ID: {item.id}</span>
                  <span style={{ fontWeight: 600 }}>Standard Qty: {item.standardQty} {item.satuan}</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Jumlah Aktual ({item.satuan})</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0"
                    value={currentItemState.jumlahAktual || ''}
                    onChange={(e) => handleInputChange(item.id, 'jumlahAktual', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Kondisi Fisik Item</label>
                  <select 
                    className="form-control"
                    value={currentItemState.kondisi || 'Bagus'}
                    onChange={(e) => handleInputChange(item.id, 'kondisi', e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="Bagus">Bagus</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Hilang">Hilang</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dokumentasi (Foto Aktual)</label>
                {currentItemState.dokumentasi ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: '150px', background: '#ddd' }}>
                       {currentItemState.dokumentasi.startsWith('data:image') || currentItemState.dokumentasi.startsWith('http') ? (
                          <img src={currentItemState.dokumentasi} alt="Dokumentasi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                          <div style={{ padding: '1rem', color: '#166534', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Camera size={18} className="mr-2"/> Image File Saved
                          </div>
                       )}
                    </div>
                    <div className="flex-between" style={{ padding: '0.75rem' }}>
                      <span style={{ color: '#166534', fontWeight: 500 }}>Image Ready</span>
                      {!isReadOnly && (
                        <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleInputChange(item.id, 'dokumentasi', '')}>
                          <Trash2 size={16} className="mr-2"/> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="upload-zone" style={{ padding: '1.5rem', position: 'relative' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                      <Upload size={24} className="text-muted mb-4" />
                      <span style={{ fontWeight: 500 }}>Click to select a photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(item.id, e)} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Catatan</label>
                <textarea 
                  className="form-control"
                  placeholder="Tambahkan catatan khusus bila perlu..."
                  value={currentItemState.catatan || ''}
                  onChange={(e) => handleInputChange(item.id, 'catatan', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          );
        })}
        
        {!isReadOnly && (
          <div className="card mt-4 text-center">
            <button type="submit" className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.1rem' }}>
              <Save size={20} className="mr-2" /> Submit Checklist
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
