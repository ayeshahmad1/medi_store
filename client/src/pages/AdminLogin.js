import React, { useState, useContext } from 'react';
import api from '../utils/api';
import { StoreContext } from '../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useContext(StoreContext);
  const navigate = useNavigate();

  if (user?.isAdmin) { navigate('/admin'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (!data.isAdmin) {
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }
      login(data);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #05231b 0%, #1a4d3c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: '800' }}>Medi<span style={{ color: '#27ae60' }}>Store</span></h1>
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>Admin Control Panel</p>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
            <h2 style={{ color: 'var(--primary-deep)', fontWeight: '700' }}>Admin Sign In</h2>
            <p style={{ color: 'var(--text-grey)', fontSize: '0.9rem', marginTop: '4px' }}>Restricted access — admins only</p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
                placeholder="admin@medistore.pk"
                id="admin-email"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                required
                placeholder="••••••••"
                id="admin-password"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px', background: loading ? '#aaa' : 'var(--primary-green)' }}
              id="admin-login-btn"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '10px', borderLeft: '4px solid var(--primary-green)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', lineHeight: '1.6' }}>
              <strong>ℹ️ First time setup?</strong><br />
              Register a normal user account, then in MongoDB set <code>isAdmin: true</code> for that user document to grant admin access.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-grey)' }}>
            Not admin? <Link to="/login" style={{ color: 'var(--primary-green)', fontWeight: '600' }}>Regular Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;