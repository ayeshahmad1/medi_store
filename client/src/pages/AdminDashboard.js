import React, { useState, useEffect, useContext, useRef } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import { StoreContext } from '../context/StoreContext';
import api from '../utils/api';

const TABS = ['Inventory', 'Orders', 'Users', 'Analytics', 'Settings'];

const AdminDashboard = () => {
  const { user } = useContext(StoreContext);
  const [activeTab, setActiveTab] = useState('Inventory');

  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', image: '', category: '', description: '', stock: '', metaTitle: '', metaDescription: '', metaKeywords: '' });
  const [imageFile, setImageFile] = useState(null);
  const [showSEO, setShowSEO] = useState(false);

  // SEO AI Bot state
  const [showSeoBot, setShowSeoBot] = useState(false);
  const [seoBotMessages, setSeoBotMessages] = useState([{ role: 'bot', content: '👋 Hi! I\'m **SeoBot** — your AI SEO specialist.\n\nI can generate optimised **Meta Title**, **Meta Description**, and **Keywords** for your product. Just click **Generate SEO Tags** or ask me anything!', isIntro: true }]);
  const [seoBotInput, setSeoBotInput] = useState('');
  const [seoBotLoading, setSeoBotLoading] = useState(false);
  const [lastSeoResult, setLastSeoResult] = useState(null);
  const seoBotEndRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState('All');

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });

  const fetchProducts = async () => {
    setProdLoading(true);
    try { const { data } = await api.get('/products'); setProducts(data); setStats(s => ({...s, products: data.length})); }
    catch (err) { console.error(err); }
    finally { setProdLoading(false); }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
      const revenue = data.filter(o => o.status !== 'Cancelled').reduce((a, o) => a + o.totalAmount, 0);
      setStats(s => ({...s, orders: data.length, revenue}));
    } catch (err) { console.error(err); }
    finally { setOrdersLoading(false); }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try { const { data } = await api.get('/users'); setUsers(data); setStats(s => ({...s, users: data.length})); }
    catch (err) { console.error(err); }
    finally { setUsersLoading(false); }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchUsers();
  }, []);

  const handleFormChange = (e) => setForm(f => ({...f, [e.target.name]: e.target.value}));
  const handleFileChange = (e) => setImageFile(e.target.files[0]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('price', Number(form.price));
    formData.append('category', form.category);
    formData.append('description', form.description);
    formData.append('stock', Number(form.stock) || 100);
    formData.append('metaTitle', form.metaTitle || '');
    formData.append('metaDescription', form.metaDescription || '');
    formData.append('metaKeywords', form.metaKeywords || '');

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editId) {
        await api.put(`/products/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const resetForm = () => {
    setForm({ name: '', price: '', image: '', category: '', description: '', stock: '', metaTitle: '', metaDescription: '', metaKeywords: '' });
    setImageFile(null);
    setEditId(null);
    setShowSEO(false);
    setShowSeoBot(false);
    setSeoBotMessages([{ role: 'bot', content: '👋 Hi! I\'m **SeoBot** — your AI SEO specialist.\n\nI can generate optimised **Meta Title**, **Meta Description**, and **Keywords** for your product. Just click **Generate SEO Tags** or ask me anything!', isIntro: true }]);
    setLastSeoResult(null);
  };

  // Apply AI-generated SEO tags to form
  const applySeoResult = (result) => {
    setForm(f => ({
      ...f,
      metaTitle: result.metaTitle || f.metaTitle,
      metaDescription: result.metaDescription || f.metaDescription,
      metaKeywords: result.metaKeywords || f.metaKeywords,
    }));
  };

  // Quick generate via button (no user message)
  const handleSeoGenerate = async () => {
    if (!form.name.trim()) {
      alert('Please enter a Medicine Name first before generating SEO tags.');
      return;
    }
    setSeoBotLoading(true);
    const thinkingMsg = { role: 'bot', content: '🔍 Analysing product and generating SEO tags...', loading: true };
    setSeoBotMessages(prev => [...prev, { role: 'user', content: `Generate SEO tags for "${form.name}"` }, thinkingMsg]);
    setTimeout(() => seoBotEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const { data } = await api.post('/chatbot/seo-generate', {
        productName: form.name,
        category: form.category,
        description: form.description,
      });
      setLastSeoResult(data);
      const botReply = {
        role: 'bot',
        content: `✅ SEO tags generated! (Score: **${data.seoScore || '—'}/100**)`,
        seoResult: data,
      };
      setSeoBotMessages(prev => [...prev.filter(m => !m.loading), botReply]);
    } catch (err) {
      setSeoBotMessages(prev => [...prev.filter(m => !m.loading), { role: 'bot', content: '⚠️ Generation failed. Please try again.' }]);
    } finally {
      setSeoBotLoading(false);
      setTimeout(() => seoBotEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Chat send
  const handleSeoBotSend = async () => {
    const msg = seoBotInput.trim();
    if (!msg || seoBotLoading) return;
    setSeoBotInput('');
    setSeoBotLoading(true);
    const userMsg = { role: 'user', content: msg };
    const thinkingMsg = { role: 'bot', content: '💭 Thinking...', loading: true };
    const updatedHistory = seoBotMessages.filter(m => !m.isIntro && !m.loading).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: typeof m.content === 'string' ? m.content : '' }));
    setSeoBotMessages(prev => [...prev, userMsg, thinkingMsg]);
    setTimeout(() => seoBotEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const { data } = await api.post('/chatbot/seo-chat', {
        productName: form.name,
        category: form.category,
        description: form.description,
        history: updatedHistory,
        message: msg,
      });
      let botReply;
      if (data.metaTitle) {
        setLastSeoResult(data);
        botReply = { role: 'bot', content: `✅ Here are your SEO tags! (Score: **${data.seoScore || '—'}/100**)`, seoResult: data };
      } else {
        botReply = { role: 'bot', content: data.reply || 'I couldn\'t generate a response. Please try again.' };
      }
      setSeoBotMessages(prev => [...prev.filter(m => !m.loading), botReply]);
    } catch (err) {
      setSeoBotMessages(prev => [...prev.filter(m => !m.loading), { role: 'bot', content: '⚠️ Something went wrong. Please try again.' }]);
    } finally {
      setSeoBotLoading(false);
      setTimeout(() => seoBotEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleEdit = (p) => {
    setEditId(p._id);
    setImageFile(null);
    setForm({ name: p.name || '', price: p.price || '', image: p.image || '', category: p.category || '', description: p.description || '', stock: p.stock || '', metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '', metaKeywords: p.metaKeywords || '' });
    setShowSEO(!!(p.metaTitle || p.metaDescription));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try { await api.delete(`/products/${id}`); fetchProducts(); }
    catch (err) { alert('Delete failed: ' + (err.response?.data?.message || err.message)); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/orders/${id}/status`, { status }); fetchOrders(); }
    catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const filteredOrders = orderFilter === 'All' ? orders : orders.filter(o => o.status === orderFilter);

  const toggleAdmin = async (id, currentVal) => {
    if (!window.confirm(`${currentVal ? 'Remove' : 'Grant'} admin access for this user?`)) return;
    try { await api.put(`/users/${id}`, { isAdmin: !currentVal }); fetchUsers(); }
    catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); }
    catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const STATUS_COLORS = { Pending: '#f59e0b', Shipped: '#3b82f6', Delivered: '#10b981', Cancelled: '#ef4444' };

  return (
    <div className="container">
      <div className="admin-layout">
        {}
        <aside className="sidebar">
          <div style={{ textAlign: 'center', padding: '16px 0 24px', borderBottom: '1px solid #f0f0f0', marginBottom: '20px' }}>
            <div className="avatar-large" style={{ margin: '0 auto 12px' }}>{user?.name?.charAt(0)}</div>
            <p style={{ fontWeight: '700', color: 'var(--primary-deep)' }}>{user?.name}</p>
            <span style={{ background: '#e8f5e9', color: 'var(--primary-green)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>Administrator</span>
          </div>

          <ul style={{ listStyle: 'none' }}>
            {TABS.map(tab => (
              <li
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
                id={`sidebar-${tab.toLowerCase()}`}
              >
                <span>{tab === 'Inventory' ? '📦' : tab === 'Orders' ? '🛒' : tab === 'Users' ? '👥' : tab === 'Analytics' ? '📊' : '⚙️'}</span>
                {tab}
                {tab === 'Orders' && orders.filter(o => o.status === 'Pending').length > 0 && (
                  <span className="badge badge-red" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                    {orders.filter(o => o.status === 'Pending').length}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {}
          <div style={{ marginTop: '30px', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>Quick Stats</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-grey)' }}>Products</span>
                <strong>{stats.products}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-grey)' }}>Orders</span>
                <strong>{stats.orders}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-grey)' }}>Users</span>
                <strong>{stats.users}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-grey)' }}>Revenue</span>
                <strong style={{ color: 'var(--primary-green)' }}>PKR {stats.revenue?.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </aside>

        {}
        <div className="main-content">

          {}
          {activeTab === 'Inventory' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-deep)' }}>📦 Inventory Management</h1>
                <button className="btn" onClick={resetForm} id="add-new-product-btn">+ New Product</button>
              </div>

              {}
              <div className="admin-form-card" style={{ marginBottom: '30px' }}>
                <form onSubmit={handleProductSubmit}>
                  <h3 style={{ marginBottom: '20px', color: 'var(--primary-deep)' }}>{editId ? '✏️ Edit Product' : '+ Add New Product'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Medicine Name *</label>
                      <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Panadol 500mg" required id="prod-name" />
                    </div>
                    <div className="form-group">
                      <label>Price (PKR) *</label>
                      <input name="price" type="number" value={form.price} onChange={handleFormChange} placeholder="0.00" required id="prod-price" />
                    </div>
                    <div className="form-group">
                      <label>Product Image *</label>
                      <input type="file" name="image" onChange={handleFileChange} accept="image/*" required={!editId} id="prod-image" />
                      {editId && form.image && (
                        <p style={{fontSize: '0.75rem', color: 'var(--text-grey)', marginTop: '4px'}}>
                          Current: {typeof form.image === 'string' ? form.image.split('/').pop() : ''} (Leave empty to keep)
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select name="category" value={form.category} onChange={handleFormChange} id="prod-category" style={{ width: '100%', padding: '12px 15px', border: '1.5px solid #e1e1e1', borderRadius: '8px', outline: 'none' }}>
                        <option value="">Select category</option>
                        <option>Antibiotic</option>
                        <option>Painkiller</option>
                        <option>Vitamin</option>
                        <option>Antacid</option>
                        <option>Cardiac</option>
                        <option>Diabetes</option>
                        <option>Allergy</option>
                        <option>General</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Stock Quantity</label>
                      <input name="stock" type="number" value={form.stock} onChange={handleFormChange} placeholder="100" id="prod-stock" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="3" value={form.description} onChange={handleFormChange} placeholder="Describe this medicine, usage, dosage..." id="prod-description" />
                  </div>

                  {/* SEO Section */}
                  <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setShowSEO(!showSEO)} style={{ background: 'none', border: '1px dashed var(--primary-green)', color: 'var(--primary-green)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                        {showSEO ? '▼ Hide SEO Settings' : '▶ SEO & Meta Tags (Optional)'}
                      </button>
                      {showSEO && (
                        <button
                          type="button"
                          id="seo-ai-toggle-btn"
                          onClick={() => setShowSeoBot(b => !b)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: showSeoBot ? '#1e293b' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', boxShadow: '0 2px 8px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
                        >
                          <span style={{ fontSize: '1rem' }}>🤖</span>
                          {showSeoBot ? 'Close SeoBot' : 'AI SEO Assistant'}
                          {!showSeoBot && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: '800' }}>AI</span>}
                        </button>
                      )}
                    </div>

                    {showSEO && (
                      <div style={{ marginTop: '16px', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ color: 'var(--primary-deep)', fontSize: '1rem', margin: 0 }}>🔍 SEO Configuration</h4>
                          <button
                            type="button"
                            id="seo-quick-gen-btn"
                            onClick={() => { setShowSeoBot(true); handleSeoGenerate(); }}
                            disabled={seoBotLoading || !form.name.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: seoBotLoading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: seoBotLoading || !form.name.trim() ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '700', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}
                          >
                            {seoBotLoading ? '⏳ Generating...' : '✨ Generate SEO Tags with AI'}
                          </button>
                        </div>

                        {/* SEO AI Chatbot Panel */}
                        {showSeoBot && (
                          <div id="seo-bot-panel" style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e0e7ff', boxShadow: '0 4px 20px rgba(99,102,241,0.12)', overflow: 'hidden' }}>
                            {/* Bot Header */}
                            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🤖</div>
                              <div>
                                <p style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem', margin: 0 }}>SeoBot — AI SEO Specialist</p>
                                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', margin: 0 }}>Powered by Ollama AI • Optimises for Google Pakistan</p>
                              </div>
                              {lastSeoResult?.seoScore && (
                                <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: lastSeoResult.seoScore >= 80 ? '#10b981' : lastSeoResult.seoScore >= 60 ? '#f59e0b' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.8rem' }}>
                                    {lastSeoResult.seoScore}
                                  </div>
                                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', margin: '2px 0 0', textAlign: 'center' }}>SEO Score</p>
                                </div>
                              )}
                            </div>

                            {/* Messages */}
                            <div style={{ height: '260px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafafe' }}>
                              {seoBotMessages.map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                  {m.role === 'bot' && (
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginRight: '8px', flexShrink: 0, alignSelf: 'flex-end' }}>🤖</div>
                                  )}
                                  <div style={{ maxWidth: '78%' }}>
                                    <div style={{
                                      padding: '10px 14px',
                                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                      background: m.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'white',
                                      color: m.role === 'user' ? 'white' : '#1e293b',
                                      fontSize: '0.82rem',
                                      lineHeight: '1.5',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                      border: m.role === 'bot' ? '1px solid #e0e7ff' : 'none',
                                      opacity: m.loading ? 0.6 : 1,
                                      whiteSpace: 'pre-wrap',
                                    }}>
                                      {typeof m.content === 'string' ? m.content.replace(/\*\*(.*?)\*\*/g, '$1') : m.content}
                                    </div>

                                    {/* SEO Result card */}
                                    {m.seoResult && (
                                      <div style={{ marginTop: '8px', background: 'white', borderRadius: '10px', border: '1px solid #e0e7ff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(99,102,241,0.1)' }}>
                                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f4ff' }}>
                                          <p style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Meta Title</p>
                                          <p style={{ fontSize: '0.82rem', color: '#1e293b', margin: 0, fontWeight: '600' }}>{m.seoResult.metaTitle}</p>
                                        </div>
                                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f4ff' }}>
                                          <p style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Meta Description</p>
                                          <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>{m.seoResult.metaDescription}</p>
                                        </div>
                                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f4ff' }}>
                                          <p style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Keywords</p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {(m.seoResult.metaKeywords || '').split(',').map((kw, ki) => (
                                              <span key={ki} style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>{kw.trim()}</span>
                                            ))}
                                          </div>
                                        </div>
                                        {m.seoResult.tips?.length > 0 && (
                                          <div style={{ padding: '10px 14px', background: '#fffbeb', borderTop: '1px solid #fef3c7' }}>
                                            <p style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>💡 SEO Tips</p>
                                            {m.seoResult.tips.map((t, ti) => (
                                              <p key={ti} style={{ fontSize: '0.75rem', color: '#78350f', margin: '2px 0', lineHeight: '1.4' }}>• {t}</p>
                                            ))}
                                          </div>
                                        )}
                                        <div style={{ padding: '10px 14px', background: '#f0fdf4' }}>
                                          <button
                                            type="button"
                                            id={`apply-seo-${i}`}
                                            onClick={() => applySeoResult(m.seoResult)}
                                            style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '9px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}
                                          >
                                            ✅ Apply These SEO Tags to Form
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div ref={seoBotEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #e0e7ff', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                id="seo-bot-input"
                                value={seoBotInput}
                                onChange={e => setSeoBotInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSeoBotSend()}
                                placeholder={form.name ? `Ask about SEO for "${form.name}"...` : 'Enter medicine name above, then ask me...'}
                                disabled={seoBotLoading}
                                style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', border: '1.5px solid #e0e7ff', outline: 'none', fontSize: '0.82rem', background: seoBotLoading ? '#f8fafc' : 'white' }}
                              />
                              <button
                                type="button"
                                id="seo-bot-send-btn"
                                onClick={handleSeoBotSend}
                                disabled={seoBotLoading || !seoBotInput.trim()}
                                style={{ background: seoBotLoading || !seoBotInput.trim() ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: seoBotLoading || !seoBotInput.trim() ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap' }}
                              >
                                {seoBotLoading ? '...' : 'Send →'}
                              </button>
                            </div>

                            {/* Quick prompts */}
                            <div style={{ padding: '0 16px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {['Generate SEO tags', 'Suggest better keywords', 'Improve meta description', 'What slug should I use?'].map(qp => (
                                <button
                                  key={qp}
                                  type="button"
                                  onClick={() => { setSeoBotInput(qp); }}
                                  style={{ background: '#f0f4ff', color: '#6366f1', border: '1px solid #e0e7ff', padding: '4px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}
                                >
                                  {qp}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="form-group">
                          <label>Meta Title <span style={{ color: 'var(--text-grey)', fontWeight: 'normal', fontSize: '0.8rem' }}>(shown in browser tab & Google)</span></label>
                          <input name="metaTitle" value={form.metaTitle} onChange={handleFormChange} placeholder={form.name ? `Buy ${form.name} Online | MediStore` : 'Buy [Medicine] Online | MediStore'} id="prod-meta-title" />
                        </div>
                        <div className="form-group">
                          <label>Meta Description <span style={{ color: 'var(--text-grey)', fontWeight: 'normal', fontSize: '0.8rem' }}>(shown in Google search results)</span></label>
                          <textarea name="metaDescription" rows="2" value={form.metaDescription} onChange={handleFormChange} placeholder="Write a compelling description for search engines (max 160 chars)" id="prod-meta-desc" />
                          <small style={{ color: form.metaDescription?.length > 160 ? '#ef4444' : 'var(--text-grey)' }}>{form.metaDescription?.length || 0}/160 characters</small>
                        </div>
                        <div className="form-group">
                          <label>Keywords <span style={{ color: 'var(--text-grey)', fontWeight: 'normal', fontSize: '0.8rem' }}>(comma-separated)</span></label>
                          <input name="metaKeywords" value={form.metaKeywords} onChange={handleFormChange} placeholder="panadol, paracetamol, painkiller, fever medicine pakistan" id="prod-keywords" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn" style={{ padding: '12px 28px' }} id="prod-submit-btn">{editId ? '✓ Update Product' : '+ Add to Inventory'}</button>
                    {editId && <button type="button" onClick={resetForm} className="btn btn-red" style={{ padding: '12px 28px' }}>✕ Cancel Edit</button>}
                  </div>
                </form>
              </div>

              {}
              <h2 style={{ marginBottom: '16px', color: 'var(--primary-deep)' }}>Current Inventory ({products.length})</h2>
              {prodLoading ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-grey)' }}>Loading products...</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>SEO</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p._id} id={`inv-row-${p._id}`}>
                          <td><img src={p.image} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '8px', background: '#f9f9f9' }} /></td>
                          <td style={{ fontWeight: '600' }}>{p.name}</td>
                          <td><span className="category-tag" style={{ fontSize: '0.75rem' }}>{p.category || 'General'}</span></td>
                          <td>PKR {p.price?.toLocaleString()}</td>
                          <td>
                            <span style={{ color: p.stock > 10 ? 'var(--primary-green)' : p.stock > 0 ? '#f59e0b' : '#ef4444', fontWeight: '600', fontSize: '0.85rem' }}>
                              {p.stock ?? 'N/A'}
                            </span>
                          </td>
                          <td>
                            {p.metaTitle ? <span style={{ color: 'var(--primary-green)', fontSize: '0.8rem' }}>✓ Set</span> : <span style={{ color: '#ddd', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEdit(p)} className="btn btn-blue" style={{ padding: '6px 12px', fontSize: '0.8rem', marginRight: '6px' }} id={`edit-${p._id}`}>Edit</button>
                            <button onClick={() => deleteProduct(p._id)} className="btn btn-red" style={{ padding: '6px 12px', fontSize: '0.8rem' }} id={`delete-${p._id}`}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {}
          {activeTab === 'Orders' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-deep)' }}>🛒 Order Management</h1>
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #ddd', outline: 'none' }} id="order-filter">
                  <option>All</option>
                  <option>Pending</option>
                  <option>Shipped</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>
              </div>
              {ordersLoading ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-grey)' }}>Loading orders...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                      <p style={{ color: 'var(--text-grey)' }}>No orders found for filter: {orderFilter}</p>
                    </div>
                  ) : filteredOrders.map(o => (
                    <div key={o._id} style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: 'var(--shadow)', border: `2px solid ${STATUS_COLORS[o.status]}20` }} id={`admin-order-${o._id}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-grey)', marginBottom: '2px' }}>Order #{o._id.slice(-8).toUpperCase()}</p>
                          <p style={{ fontWeight: '700', color: '#333' }}>{o.user?.name || 'Unknown'}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-grey)' }}>{o.user?.email}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: '800', color: 'var(--primary-deep)', fontSize: '1.1rem' }}>PKR {o.totalAmount?.toLocaleString()}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)' }}>{o.items?.length} items • {new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <select
                            value={o.status}
                            onChange={e => updateStatus(o._id, e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${STATUS_COLORS[o.status] || '#ddd'}`, outline: 'none', fontWeight: '600', color: STATUS_COLORS[o.status], background: `${STATUS_COLORS[o.status]}15`, fontSize: '0.85rem' }}
                            id={`status-${o._id}`}
                          >
                            <option>Pending</option>
                            <option>Shipped</option>
                            <option>Delivered</option>
                            <option>Cancelled</option>
                          </select>
                          <button onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)} style={{ background: 'none', border: '1px solid #ddd', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            {expandedOrder === o._id ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                      {expandedOrder === o._id && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                              <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-grey)' }}>ORDER ITEMS</h4>
                              {o.items?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '0.85rem' }}>
                                  <span>{item.name} × {item.quantity}</span>
                                  <span style={{ fontWeight: '600' }}>PKR {(item.price * item.quantity)?.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-grey)' }}>SHIPPING ADDRESS</h4>
                              {o.shippingAddress ? (
                                <div style={{ fontSize: '0.85rem', lineHeight: '1.8', color: '#333' }}>
                                  <p>{o.shippingAddress.fullName} • {o.shippingAddress.phone}</p>
                                  <p>{o.shippingAddress.street}</p>
                                  <p>{o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.zip}</p>
                                </div>
                              ) : <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>No address recorded</p>}
                              <p style={{ marginTop: '8px', fontSize: '0.8rem', color: o.isPaid ? 'var(--primary-green)' : '#f59e0b', fontWeight: '600' }}>
                                {o.isPaid ? '✓ PAID' : '⏳ PAYMENT PENDING'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {}
          {activeTab === 'Users' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ color: 'var(--primary-deep)' }}>👥 User Management</h1>
                <span style={{ color: 'var(--text-grey)', fontSize: '0.9rem' }}>{users.length} total users</span>
              </div>
              {usersLoading ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-grey)' }}>Loading users...</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id} id={`user-row-${u._id}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-green), var(--primary-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: '600' }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-grey)', fontSize: '0.9rem' }}>{u.email}</td>
                          <td style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>{u.phone || '—'}</td>
                          <td>
                            <span style={{ background: u.isAdmin ? '#fef3c7' : '#dbeafe', color: u.isAdmin ? '#d97706' : '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                              {u.isAdmin ? '⚡ Admin' : '👤 User'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {u._id !== user?._id && (
                              <>
                                <button
                                  onClick={() => toggleAdmin(u._id, u.isAdmin)}
                                  className="btn"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', marginRight: '6px', background: u.isAdmin ? '#6b7280' : 'var(--primary-green)' }}
                                  id={`toggle-admin-${u._id}`}
                                >
                                  {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                                </button>
                                <button onClick={() => deleteUser(u._id)} className="btn btn-red" style={{ padding: '6px 12px', fontSize: '0.75rem' }} id={`del-user-${u._id}`}>Delete</button>
                              </>
                            )}
                            {u._id === user?._id && <span style={{ color: 'var(--text-grey)', fontSize: '0.8rem' }}>You</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === 'Analytics' && <AnalyticsDashboard />}

          {}
          {activeTab === 'Settings' && (
            <div>
              <h1 style={{ color: 'var(--primary-deep)', marginBottom: '24px' }}>⚙️ Settings</h1>
              <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: 'var(--shadow)' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--primary-deep)' }}>System Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '4px' }}>Backend</p>
                    <p style={{ fontWeight: '700' }}>Node.js + Express</p>
                  </div>
                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '4px' }}>Database</p>
                    <p style={{ fontWeight: '700' }}>MongoDB (local)</p>
                  </div>
                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '4px' }}>Payment</p>
                    <p style={{ fontWeight: '700' }}>Stripe (Sandbox)</p>
                  </div>
                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '4px' }}>Admin User</p>
                    <p style={{ fontWeight: '700' }}>{user?.email}</p>
                  </div>
                </div>
                <div style={{ marginTop: '24px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px' }}>⚡ Stripe Setup</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-grey)', lineHeight: '1.6' }}>
                    To enable real payments: Add <code>STRIPE_SECRET_KEY</code> to <code>server/.env</code> and <code>REACT_APP_STRIPE_PK</code> to <code>client/.env</code>.
                    Get your test keys at <strong>dashboard.stripe.com/test/apikeys</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;