import React, { useState } from 'react';
import { X, Lock, Key, AlertCircle, CheckCircle } from 'lucide-react';

const ChangePasswordModal = ({ isOpen, onClose, token }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengubah password');
      }

      setSuccess('Password berhasil diperbarui!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px', borderRadius: '12px', overflow: 'hidden', padding: 0, border: 'none' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>
            <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: '#EEF2FF', borderRadius: '8px', color: 'var(--primary)' }}>
              <Key size={20} />
            </div>
            Ubah Password
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ padding: '0.5rem' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'white' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}
          
          {success && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <CheckCircle size={18} style={{ flexShrink: 0 }} /> {success}
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Password Lama</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '0.8rem', left: '1rem', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="Masukkan password saat ini"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Password Baru</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', top: '0.8rem', left: '1rem', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Konfirmasi Password</label>
            <div style={{ position: 'relative' }}>
              <CheckCircle size={18} style={{ position: 'absolute', top: '0.8rem', left: '1rem', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ulangi password baru"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1, padding: '0.75rem' }}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
