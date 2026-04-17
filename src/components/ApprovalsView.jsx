import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Clock, MapPin, User } from 'lucide-react';

export default function ApprovalsView({ fetchResetRequests, handleResetApproval, onBack }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await fetchResetRequests();
    setRequests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onAction = async (id, status) => {
    const verb = status === 'approved' ? 'menyetujui' : 'menolak';
    if (window.confirm(`Apakah Anda yakin ingin ${verb} permintaan reset ini?`)) {
      const success = await handleResetApproval(id, status);
      if (success) {
        loadRequests();
      } else {
        alert('Gagal memproses permintaan.');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Persetujuan Reset Data</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Kelola permintaan pembatalan/reset data checklist dari Surveyor</p>
        </div>
        <button className="btn btn-outline" onClick={onBack}>Kembali</button>
      </div>

      <div className="card shadow-md">
        {isLoading ? (
          <div className="text-center py-8">Memuat data...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <Check size={48} color="#10B981" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 className="text-muted">Tidak ada permintaan pending</h3>
            <p className="text-muted">Semua permintaan telah diproses.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Waktu Permintaan</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Minta Oleh</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Lokasi Target</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Clock size={16} className="mr-2 text-muted" />
                        <span>{new Date(req.created_at).toLocaleString('id-ID')}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <User size={16} className="mr-2 text-muted" />
                        <span style={{ fontWeight: 600 }}>{req.requested_by}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <MapPin size={16} className="mr-2 text-muted" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{req.location_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID: {req.location_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline-danger" style={{ padding: '0.4rem' }} onClick={() => onAction(req.id, 'rejected')}>
                          <X size={18} className="mr-1" /> Tolak
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.4rem' }} onClick={() => onAction(req.id, 'approved')}>
                          <Check size={18} className="mr-1" /> Setujui
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 p-4" style={{ backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FEE2E2', display: 'flex', gap: '1rem' }}>
        <AlertCircle size={24} color="#EF4444" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ color: '#991B1B', marginBottom: '0.25rem' }}>Peringatan Penting</h4>
          <p style={{ color: '#B91C1C', fontSize: '0.85rem', margin: 0 }}>
            Menyetujui permintaan reset akan <strong>MENGHAPUS SELURUH DATA CHECKLIST</strong> dan foto untuk lokasi tersebut secara permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </div>
    </div>
  );
}
