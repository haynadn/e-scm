import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        // Success
        onLoginSuccess(data.token, data.role, data.username);
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div className="text-center mb-4">
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.5rem', lineHeight: '1.2' }}>Sigma CMO<br/><span style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>Checklist Manager Online</span></h2>
        </div>
        
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
               <User size={18} style={{ position: 'absolute', top: '0.8rem', left: '0.8rem', color: 'var(--text-muted)' }}/>
               <input 
                 type="text" 
                 className="form-control" 
                 style={{ paddingLeft: '2.5rem' }}
                 value={username}
                 onChange={e => setUsername(e.target.value)}
                 required
               />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
               <Lock size={18} style={{ position: 'absolute', top: '0.8rem', left: '0.8rem', color: 'var(--text-muted)' }}/>
               <input 
                 type="password" 
                 className="form-control" 
                 style={{ paddingLeft: '2.5rem' }}
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 required
               />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary w-full" disabled={isLoading} style={{ marginTop: '1rem' }}>
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
        
        <p className="text-center text-muted" style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
          Default: admin / password123
        </p>
      </div>
    </div>
  );
}
