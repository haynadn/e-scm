import React, { useState, useEffect } from 'react';
import { UserPlus, Users, ArrowLeft, Shield, Eye, Trash2 } from 'lucide-react';

export default function UserManagement({ onBack, token }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'User berhasil ditambahkan!', type: 'success' });
        setNewUsername('');
        setNewPassword('');
        setNewRole('viewer');
        fetchUsers();
      } else {
        setMessage({ text: data.error || 'Gagal menambahkan user', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Kesalahan jaringan', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <h2><Users className="mr-2" style={{ verticalAlign: 'middle' }} /> User Management</h2>
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Form Add User */}
        <div className="card">
          <h3 className="mb-4">Tambah User Baru</h3>
          {message.text && (
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEE2E2', 
              color: message.type === 'success' ? '#065F46' : '#B91C1C', 
              borderRadius: '8px', 
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-control" 
                value={newUsername} 
                onChange={e => setNewUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select 
                className="form-control" 
                value={newRole} 
                onChange={e => setNewRole(e.target.value)}
              >
                <option value="viewer">Viewer (Read Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              <UserPlus size={18} className="mr-2" /> {isSubmitting ? 'Mendaftarkan...' : 'Tambah User'}
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="card">
          <h3 className="mb-4">Daftar User Sistem</h3>
          {isLoading ? (
            <div className="text-center py-4">Loading user data...</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Username</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{u.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          backgroundColor: u.role === 'admin' ? '#EEF2FF' : '#F3F4F6',
                          color: u.role === 'admin' ? 'var(--primary)' : '#4B5563'
                        }}>
                          {u.role === 'admin' ? <Shield size={12} /> : <Eye size={12} />}
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
