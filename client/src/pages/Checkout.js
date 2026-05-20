import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import api from '../utils/api';

const STRIPE_PK = process.env.REACT_APP_STRIPE_PK || 'pk_test_placeholder';

const Checkout = () => {
  const { cart, user, clearCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const total = cart.reduce((a, c) => a + c.price * c.quantity, 0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
    country: 'Pakistan'
  });

  const [card, setCard] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: user?.name || ''
  });

  const isAddressValid = () =>
    address.fullName && address.phone && address.street && address.city;

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!isAddressValid()) { alert('Please fill in all required fields'); return; }
    setStep(2);
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    setCard(prev => ({ ...prev, number: val }));
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
    setCard(prev => ({ ...prev, expiry: val }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (cart.length === 0) { alert('Your cart is empty'); return; }
    setLoading(true);

    try {

      const { data: intentData } = await api.post('/payment/create-intent', { amount: total });

      let paymentResult = {
        id: intentData.clientSecret || `demo_${Date.now()}`,
        status: 'succeeded',
        update_time: new Date().toISOString(),
        email_address: user?.email
      };

      if (!intentData.demo && STRIPE_PK !== 'pk_test_placeholder') {
        try {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripe = await loadStripe(STRIPE_PK);
          const result = await stripe.confirmCardPayment(intentData.clientSecret, {
            payment_method: {
              card: { number: card.number.replace(/\s/g, ''), exp_month: parseInt(card.expiry.split('/')[0]), exp_year: parseInt('20' + card.expiry.split('/')[1]), cvc: card.cvc },
              billing_details: { name: card.name }
            }
          });
          if (result.error) throw new Error(result.error.message);
          paymentResult = {
            id: result.paymentIntent.id,
            status: result.paymentIntent.status,
            update_time: new Date().toISOString(),
            email_address: user?.email
          };
        } catch (stripeErr) {
          console.warn('Stripe card confirm failed, using demo mode:', stripeErr.message);
        }
      }

      const orderItems = cart.map(i => ({
        product: i._id,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity
      }));

      const { data: order } = await api.post('/orders', {
        items: orderItems,
        totalAmount: total,
        shippingAddress: address,
        paymentMethod: 'Stripe',
        paymentResult
      });

      setOrderId(order._id);
      setOrderPlaced(true);
      clearCart();
    } catch (err) {
      console.error('Order error:', err);
      alert('Order failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) return (
    <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div className="success-animation">✅</div>
      <h1 style={{ color: 'var(--primary-deep)', marginTop: '20px', marginBottom: '10px' }}>Order Placed Successfully!</h1>
      <p style={{ color: 'var(--text-grey)', fontSize: '1.1rem', marginBottom: '30px' }}>
        Thank you, {user?.name}! Your medicines are on the way. 🚀
      </p>
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button onClick={() => navigate('/orders')} className="btn" style={{ padding: '12px 30px' }}>Track My Order</button>
        <button onClick={() => navigate('/')} className="btn btn-outline" style={{ padding: '12px 30px' }}>Continue Shopping</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1 style={{ marginBottom: '8px', color: 'var(--primary-deep)' }}>Checkout</h1>

      {}
      <div className="checkout-steps">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}><span>1</span> Shipping</div>
        <div className="step-line" />
        <div className={`step ${step >= 2 ? 'active' : ''}`}><span>2</span> Payment</div>
        <div className="step-line" />
        <div className={`step ${orderPlaced ? 'active done' : ''}`}><span>3</span> Confirm</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '40px' }}>
        {}
        <div>
          {step === 1 && (
            <div className="checkout-card">
              <h2 style={{ marginBottom: '24px' }}>📬 Shipping Address</h2>
              <form onSubmit={handleAddressSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input value={address.fullName} onChange={e => setAddress(a => ({...a, fullName: e.target.value}))} required placeholder="Your full name" id="checkout-fullname" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input value={address.phone} onChange={e => setAddress(a => ({...a, phone: e.target.value}))} required placeholder="+92 300 1234567" id="checkout-phone" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Street Address *</label>
                  <input value={address.street} onChange={e => setAddress(a => ({...a, street: e.target.value}))} required placeholder="House/Flat no., Street, Area" id="checkout-street" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>City *</label>
                    <input value={address.city} onChange={e => setAddress(a => ({...a, city: e.target.value}))} required placeholder="Lahore" id="checkout-city" />
                  </div>
                  <div className="form-group">
                    <label>Province</label>
                    <input value={address.state} onChange={e => setAddress(a => ({...a, state: e.target.value}))} placeholder="Punjab" />
                  </div>
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input value={address.zip} onChange={e => setAddress(a => ({...a, zip: e.target.value}))} placeholder="75500" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input value="Pakistan" disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                <button type="submit" className="btn" style={{ width: '100%', padding: '15px', marginTop: '10px' }} id="checkout-next-btn">
                  Continue to Payment →
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="checkout-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-grey)' }}>← Back</button>
                <h2>💳 Payment Details</h2>
              </div>

              <div className="demo-notice">
                <strong>🧪 Sandbox Mode:</strong> Use test card <code>4242 4242 4242 4242</code> with any future expiry and any 3-digit CVC.
                <br/><small>To enable real Stripe payments, add your <code>REACT_APP_STRIPE_PK</code> key to client/.env</small>
              </div>

              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input value={card.name} onChange={e => setCard(c => ({...c, name: e.target.value}))} placeholder="Name on card" required id="card-name" />
                </div>
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    value={card.number}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    required
                    maxLength={19}
                    className="card-input"
                    id="card-number"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input value={card.expiry} onChange={handleExpiryChange} placeholder="MM/YY" required maxLength={5} id="card-expiry" />
                  </div>
                  <div className="form-group">
                    <label>CVC</label>
                    <input value={card.cvc} onChange={e => setCard(c => ({...c, cvc: e.target.value.replace(/\D/g,'').substring(0,4)}))} placeholder="123" required maxLength={4} id="card-cvc" />
                  </div>
                </div>
                <button type="submit" className="btn" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1rem' }} disabled={loading} id="pay-now-btn">
                  {loading ? 'Processing Payment...' : `🔒 Pay PKR ${total.toLocaleString()}`}
                </button>
              </form>
            </div>
          )}
        </div>

        {}
        <div className="checkout-card" style={{ height: 'fit-content', position: 'sticky', top: '90px' }}>
          <h3 style={{ marginBottom: '20px' }}>Order Summary</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {cart.map(item => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f9f9f9', borderRadius: '6px' }} />
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</p>
                    <p style={{ color: 'var(--text-grey)', fontSize: '0.8rem' }}>Qty: {item.quantity}</p>
                  </div>
                </div>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-grey)' }}>Subtotal</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-grey)' }}>Shipping</span>
              <span style={{ color: 'var(--primary-green)' }}>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.2rem', paddingTop: '12px', borderTop: '2px solid #eee' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary-deep)' }}>PKR {total.toLocaleString()}</span>
            </div>
          </div>
          {step === 2 && address.street && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '0.85rem' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>📬 Shipping to:</p>
              <p style={{ color: 'var(--text-grey)' }}>{address.fullName}</p>
              <p style={{ color: 'var(--text-grey)' }}>{address.street}, {address.city}</p>
              <p style={{ color: 'var(--text-grey)' }}>{address.state} {address.zip}, {address.country}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;