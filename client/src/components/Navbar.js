import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';

const Navbar = () => {
  const { user, logout, cart, wishlist } = useContext(StoreContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setDropdownOpen(false); };

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <Link to="/">
          <h2 style={{ fontWeight: 700, fontSize: '1.8rem' }}>Medi<span style={{ color: 'var(--primary-green)' }}>Store</span></h2>
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/" className="nav-link">Shop</Link>

          <Link to="/cart" className="nav-icon-btn" title="Cart">
            🛒 {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </Link>

          {user ? (
            <>
              <Link to="/wishlist" className="nav-icon-btn" title="Wishlist">
                ❤️ {wishlistCount > 0 && <span className="badge badge-red">{wishlistCount}</span>}
              </Link>
              <div className="nav-dropdown" ref={dropdownRef}>
                <button
                  className="nav-avatar"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  id="nav-user-menu"
                >
                  <span className="avatar-circle">{user.name?.charAt(0).toUpperCase()}</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.9rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name?.split(' ')[0]}</span>
                  <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>▾</span>
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu" id="nav-dropdown-menu">
                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>👤 My Profile</Link>
                    <Link to="/orders" className="dropdown-item" onClick={() => setDropdownOpen(false)}>📦 My Orders</Link>
                    <Link to="/wishlist" className="dropdown-item" onClick={() => setDropdownOpen(false)}>❤️ Wishlist</Link>
                    {user.isAdmin && (
                      <>
                        <div className="dropdown-divider" />
                        <Link to="/admin" className="dropdown-item dropdown-admin" onClick={() => setDropdownOpen(false)}>⚙️ Admin Dashboard</Link>
                      </>
                    )}
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item dropdown-logout">🚪 Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline" style={{ marginLeft: '10px', padding: '8px 20px' }}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;