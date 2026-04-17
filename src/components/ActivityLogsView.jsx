import React, { useState, useEffect } from 'react';
import { History, ArrowLeft, Search, Clock, User } from 'lucide-react';

export default function ActivityLogsView({ token, onBack }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${BASE_URL}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => 
    log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2><History className="mr-2" style={{ verticalAlign: 'middle' }} /> User Activity Logs</h2>
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
      </div>

      <div className="card mb-4">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Cari logs (User, Aksi, atau Detail)..." 
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">Loading logs...</div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: '#F9FAFB' }}>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Waktu</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Aksi</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted">Tidak ada data log ditemukan.</td></tr>
                )}
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: '#6B7280' }}>
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      <div className="flex items-center">
                        <User size={14} className="mr-1" />
                        {log.username}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        backgroundColor: '#EEF2FF', 
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#4B5563' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
