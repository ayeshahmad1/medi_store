import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { StoreContext } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = ['All', 'Antibiotic', 'Painkiller', 'Vitamin', 'Antacid', 'Cardiac', 'Diabetes', 'Allergy', 'General'];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const { addToCart, toggleWishlist, isInWishlist, user } = useContext(StoreContext);
  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (localSearch) params.search = localSearch;
      if (activeCategory !== 'All') params.category = activeCategory;
      const { data } = await api.get('/products', { params });
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [localSearch, activeCategory]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 400);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    const fetchSugg = async () => {
      if (localSearch.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const { data } = await api.get(`/chatbot/suggestions?q=${encodeURIComponent(localSearch)}`);
        setSuggestions(data);
      } catch (err) {
        setSuggestions([]);
      }
    };
    const sgtimer = setTimeout(fetchSugg, 250);
    return () => clearTimeout(sgtimer);
  }, [localSearch]);

  const handleSearchSubmit = () => {
    setShowSuggestions(false);
    fetchProducts();

    window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' });
  };

  const handleWishlist = async (e, product) => {
    e.preventDefault();
    if (!user) { alert('Please login to use wishlist'); return; }
    await toggleWishlist(product);
  };

  return (
    <div>
      {}
      <section className="hero">
        <div className="container">
          <h1>Quality Healthcare, <span style={{ color: 'var(--primary-green)' }}>Delivered</span></h1>
          <p>Find authentic medicines and healthcare products at your doorstep. Safe, reliable, and 100% authentic.</p>
          <div className="search-bar-ui" style={{ position: 'relative' }}>
            <input
              id="home-search-input"
              type="text"
              placeholder="Search for medicines (e.g. Panadol, Insulin)..."
              value={localSearch}
              onChange={e => { setLocalSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
            />
            <button onClick={handleSearchSubmit}>Search</button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions" style={{
                position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', marginTop: '10px',
                borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 10, textAlign: 'left',
                overflow: 'hidden', border: '1px solid #eee'
              }}>
                {suggestions.map((s, i) => (
                  <div 
                    key={i} 
                    className="suggestion-row"
                    style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${s._id}`)}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: '#1a1a1a', display: 'block' }}>{s.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#777' }}>{s.category}</span>
                    </div>
                    <span style={{ fontWeight: '700', color: 'var(--primary-green)' }}>PKR {s.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {}
      <div className="stats-bar">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '60px', padding: '20px 0' }}>
          <div className="stat-item"><span className="stat-num">500+</span><span className="stat-label">Medicines</span></div>
          <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">Authentic</span></div>
          <div className="stat-item"><span className="stat-num">24/7</span><span className="stat-label">Support</span></div>
          <div className="stat-item"><span className="stat-num">Free</span><span className="stat-label">Delivery</span></div>
        </div>
      </div>

      <div className="container">
        {}
        <div className="category-filter">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              id={`category-${cat.toLowerCase()}`}
              className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-deep)' }}>
            {activeCategory === 'All' && !localSearch ? 'Popular Medicines' : `Results ${products.length > 0 ? `(${products.length})` : ''}`}
          </h2>
          {(localSearch || activeCategory !== 'All') && (
            <button className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => { setLocalSearch(''); setActiveCategory('All'); }}>
              Clear Filters ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
            <h3>No medicines found</h3>
            <p>Try a different search term or category</p>
            <button className="btn" style={{ marginTop: '16px' }} onClick={() => { setLocalSearch(''); setActiveCategory('All'); }}>Browse All</button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <div key={p._id} className="card" id={`product-card-${p._id}`}>
                <div style={{ position: 'relative' }}>
                  <button
                    className={`wishlist-btn ${isInWishlist(p._id) ? 'active' : ''}`}
                    onClick={(e) => handleWishlist(e, p)}
                    title={isInWishlist(p._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    id={`wishlist-btn-${p._id}`}
                  >
                    {isInWishlist(p._id) ? '❤️' : '🤍'}
                  </button>
                  <span className="category">{p.category || 'General'}</span>
                  <img src={p.image} alt={p.name} />
                  <h3>{p.name}</h3>
                  <p className="price">PKR {p.price?.toLocaleString()}</p>
                  {p.stock !== undefined && (
                    <span className={`stock-badge ${p.stock > 10 ? 'in-stock' : p.stock > 0 ? 'low-stock' : 'out-stock'}`}>
                      {p.stock > 10 ? 'In Stock' : p.stock > 0 ? `Only ${p.stock} left` : 'Out of Stock'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <Link to={`/product/${p._id}`} className="btn btn-blue" style={{ flex: 1, padding: '10px 0', textAlign: 'center' }}>Details</Link>
                  <button
                    onClick={() => addToCart(p)}
                    className="btn"
                    style={{ flex: 1, padding: '10px 0' }}
                    disabled={p.stock === 0}
                    id={`add-to-cart-${p._id}`}
                  >
                    {p.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;