import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Link } from 'react-router-dom';

const Wishlist = () => {
  const { wishlist, toggleWishlist, addToCart } = useContext(StoreContext);

  const handleRemove = async (product) => {
    await toggleWishlist(product);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: 'var(--primary-deep)', marginBottom: '4px' }}>My Wishlist</h1>
          <p style={{ color: 'var(--text-grey)' }}>{wishlist.length} item{wishlist.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Link to="/" className="btn btn-outline" style={{ padding: '10px 20px' }}>+ Add More</Link>
      </div>

      {wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🤍</div>
          <h3 style={{ marginBottom: '8px' }}>Your wishlist is empty</h3>
          <p style={{ color: 'var(--text-grey)', marginBottom: '24px' }}>Save medicines you love by clicking the heart icon</p>
          <Link to="/" className="btn">Explore Medicines</Link>
        </div>
      ) : (
        <div className="product-grid">
          {wishlist.map(p => (
            <div key={p._id} className="card" id={`wishlist-item-${p._id}`}>
              <div style={{ position: 'relative' }}>
                <button
                  className="wishlist-btn active"
                  onClick={() => handleRemove(p)}
                  title="Remove from wishlist"
                  id={`remove-wish-${p._id}`}
                >❤️</button>
                <span className="category">{p.category || 'General'}</span>
                <img src={p.image} alt={p.name} />
                <h3>{p.name}</h3>
                <p className="price">PKR {p.price?.toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <Link to={`/product/${p._id}`} className="btn btn-blue" style={{ flex: 1, textAlign: 'center', padding: '10px 0' }}>Details</Link>
                <button
                  onClick={() => addToCart(p)}
                  className="btn"
                  style={{ flex: 1, padding: '10px 0' }}
                  id={`wish-add-cart-${p._id}`}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;