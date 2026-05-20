import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { StoreContext } from '../context/StoreContext';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart, toggleWishlist, isInWishlist, user } = useContext(StoreContext);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${id}`)
      .then(res => { setProduct(res.data); setLoading(false); })
      .catch(err => { console.error('Error fetching product:', err); setLoading(false); });
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlist = async () => {
    if (!user) { alert('Please login to use wishlist'); return; }
    await toggleWishlist(product);
  };

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', padding: '80px' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-grey)', marginTop: '20px' }}>Loading product details...</p>
    </div>
  );

  if (!product) return (
    <div className="container" style={{ textAlign: 'center', padding: '80px' }}>
      <div style={{ fontSize: '3rem' }}>😔</div>
      <h2>Product not found</h2>
      <Link to="/" className="btn" style={{ marginTop: '20px' }}>Back to Shop</Link>
    </div>
  );

  const inWishlist = isInWishlist(product._id);

  return (
    <>
      {}
      <Helmet>
        <title>{product.metaTitle || product.name} | MediStore</title>
        <meta name="description" content={product.metaDescription || product.description || `Buy ${product.name} at MediStore Pakistan. Authentic medicine delivered to your doorstep.`} />
        <meta name="keywords" content={product.metaKeywords || `${product.name}, ${product.category || 'medicine'}, buy medicine online Pakistan`} />
        <meta property="og:title" content={product.metaTitle || product.name} />
        <meta property="og:description" content={product.metaDescription || product.description} />
        <meta property="og:image" content={product.image} />
        <meta property="og:type" content="product" />
      </Helmet>

      <div className="container">
        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{ color: 'var(--primary-green)', fontWeight: '600', fontSize: '0.9rem' }}>← Back to Shop</Link>
        </div>

        <div className="details-layout">
          <div className="details-image">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="details-info">
            <span className="category-tag">{product.category || 'General'}</span>
            <h1>{product.name}</h1>
            <p className="description">{product.description || 'No description available for this medicine.'}</p>
            <p className="price-tag">PKR {product.price?.toLocaleString()}</p>

            {product.stock !== undefined && (
              <div style={{ marginBottom: '20px' }}>
                <span className={`stock-badge large ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-stock'}`}>
                  {product.stock > 10 ? `✓ In Stock (${product.stock} units)` : product.stock > 0 ? `⚠ Only ${product.stock} left` : '✗ Out of Stock'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddToCart}
                className={`btn ${addedToCart ? 'btn-success' : 'btn-blue'}`}
                disabled={product.stock === 0}
                style={{ padding: '15px 35px', fontSize: '1.1rem' }}
                id="product-add-to-cart"
              >
                {addedToCart ? '✓ Added!' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                onClick={handleWishlist}
                className={`btn ${inWishlist ? 'btn-wishlist-active' : 'btn-wishlist'}`}
                style={{ padding: '15px 25px', fontSize: '1.1rem' }}
                id="product-wishlist-btn"
              >
                {inWishlist ? '❤️ Wishlisted' : '🤍 Wishlist'}
              </button>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '6px' }}>✓ 100% Authentic Product</p>
              <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem', marginBottom: '6px' }}>✓ Fast Home Delivery</p>
              <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>✓ Easy Returns within 7 days</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetails;