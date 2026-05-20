import React, { useState, useEffect, useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const UserProfile = () => {
  const { user, login } = useContext(StoreContext);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('profile'); 

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
    country: user?.address?.country || 'Pakistan'
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });

  useEffect(() => {
    api.get('/orders/myorders').then(res => setOrders(res.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: form.name,
        phone: form.phone,
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: form.country }
      });
      login({ ...user, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { alert('Passwords do not match'); return; }
    if (passwords.newPass.length < 6) { alert('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await api.put('/auth/profile', { password: passwords.newPass });
      setPasswords({ current: '', newPass: '', confirm: '' });
      alert('Password updated successfully!');
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const ordersSummary = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    delivered: orders.filter(o => o.status === 'Delivered').length
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '8px', color: 'var(--primary-deep)' }}>My Account</h1>
      <p style={{ color: 'var(--text-grey)', marginBottom: '30px' }}>Manage your profile, address and password</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        {}
        <div>
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)', padding: '30px', textAlign: 'center', marginBottom: '20px' }}>
            <div className="avatar-large">{user?.name?.charAt(0).toUpperCase()}</div>
            <h2 style={{ margin: '16px 0 4px', color: 'var(--primary-deep)' }}>{user?.name}</h2>
            <p style={{ color: 'var(--text-grey)', fontSize: '0.9rem' }}>{user?.email}</p>
            {user?.isAdmin && <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'inline-block', marginTop: '8px' }}>⚡ Admin</span>}
          </div>

          {}
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)', padding: '24px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--primary-deep)' }}>Order Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey)' }}>Total Orders</span>
                <span style={{ fontWeight: '700', color: 'var(--primary-deep)' }}>{ordersSummary.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey)' }}>Pending</span>
                <span style={{ fontWeight: '700', color: '#f59e0b' }}>{ordersSummary.pending}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-grey)' }}>Delivered</span>
                <span style={{ fontWeight: '700', color: 'var(--primary-green)' }}>{ordersSummary.delivered}</span>
              </div>
            </div>
            <Link to="/orders" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', marginTop: '16px', display: 'block', padding: '10px' }}>
              View All Orders →
            </Link>
          </div>
        </div>

        {}
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)', padding: '30px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', borderBottom: '2px solid #f0f0f0', paddingBottom: '16px' }}>
            <button
              className={`tab-btn ${tab === 'profile' ? 'active' : ''}`}
              onClick={() => setTab('profile')}
              id="profile-tab-btn"
            >Personal Info</button>
            <button
              className={`tab-btn ${tab === 'password' ? 'active' : ''}`}
              onClick={() => setTab('password')}
              id="password-tab-btn"
            >Change Password</button>
          </div>

          {tab === 'profile' && (
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required id="profile-name" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+92 300 0000000" id="profile-phone" />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input value={user?.email} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                <small style={{ color: 'var(--text-grey)' }}>Email cannot be changed here</small>
              </div>
              <h4 style={{ margin: '20px 0 16px', color: 'var(--primary-deep)' }}>🏠 Delivery Address</h4>
              <div className="form-group">
                <label>Street Address</label>
                <input value={form.street} onChange={e => setForm(f => ({...f, street: e.target.value}))} placeholder="House/flat no., street, area" id="profile-street" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder="Lahore" />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} placeholder="Punjab" />
                </div>
                <div className="form-group">
                  <label>ZIP</label>
                  <input value={form.zip} onChange={e => setForm(f => ({...f, zip: e.target.value}))} placeholder="75500" />
                </div>
              </div>
              <button type="submit" className={`btn ${saved ? 'btn-success' : ''}`} disabled={saving} style={{ padding: '12px 30px', marginTop: '10px' }} id="save-profile-btn">
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={passwords.newPass} onChange={e => setPasswords(p => ({...p, newPass: e.target.value}))} placeholder="Min 6 characters" required id="new-password" />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({...p, confirm: e.target.value}))} placeholder="Repeat new password" required id="confirm-password" />
              </div>
              <button type="submit" className="btn btn-blue" disabled={saving} style={{ padding: '12px 30px' }} id="change-password-btn">
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;