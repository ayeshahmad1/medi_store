import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, user, clearCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const total = cart.reduce((a, c) => a + c.price * c.quantity, 0);

  const handleCheckout = () => {
    if (!user) { navigate('/login'); return; }
    navigate('/checkout');
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px', color: 'var(--primary-deep)' }}>Your Shopping Cart</h1>
      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛒</div>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-grey)', marginBottom: '20px' }}>Your cart is currently empty.</p>
          <Link to="/" className="btn btn-blue">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</h3>
              <button onClick={clearCart} style={{ background: 'none', border: 'none', color: 'var(--text-grey)', cursor: 'pointer', fontSize: '0.85rem' }}>Clear all</button>
            </div>
            {cart.map(item => (
              <div key={item._id} className="cart-item">
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '70px', height: '70px', background: '#f9f9f9', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <img src={item.image} alt={item.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{item.name}</h3>
                    <p style={{ color: 'var(--primary-green)', fontWeight: '700' }}>PKR {item.price?.toLocaleString()}</p>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>Subtotal: PKR {(item.price * item.quantity)?.toLocaleString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)} id={`qty-minus-${item._id}`}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)} id={`qty-plus-${item._id}`}>+</button>
                  </div>
                  <button onClick={() => removeFromCart(item._id)} className="btn btn-red" style={{ padding: '8px 14px', fontSize: '0.8rem' }} id={`remove-${item._id}`}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: 'var(--shadow)', height: 'fit-content', position: 'sticky', top: '90px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-grey)' }}>Subtotal ({cart.length} items)</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-grey)' }}>Shipping</span>
              <span style={{ color: 'var(--primary-green)', fontWeight: '600' }}>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', paddingTop: '16px', borderTop: '2px solid #eee', fontWeight: '700', fontSize: '1.2rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary-deep)' }}>PKR {total.toLocaleString()}</span>
            </div>
            <button onClick={handleCheckout} className="btn" style={{ width: '100%', padding: '15px', fontSize: '1rem' }} id="proceed-to-checkout">
              Proceed to Checkout →
            </button>
            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-grey)' }}>🔒 Secure SSL Encrypted Checkout</p>
            <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '0.85rem', color: 'var(--primary-green)' }}>← Continue Shopping</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;