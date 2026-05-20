import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import api from '../utils/api';

const STATUS_CONFIG = {
  Pending:   { color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  Shipped:   { color: '#3b82f6', bg: '#dbeafe', icon: '🚚' },
  Delivered: { color: '#10b981', bg: '#d1fae5', icon: '✅' },
  Cancelled: { color: '#ef4444', bg: '#fee2e2', icon: '❌' }
};

const OrderHistory = () => {
  const { user } = useContext(StoreContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    api.get('/orders/myorders')
      .then(res => { setOrders(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', padding: '80px' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-grey)', marginTop: '20px' }}>Loading your orders...</p>
    </div>
  );

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: 'var(--primary-deep)', marginBottom: '4px' }}>My Orders</h1>
          <p style={{ color: 'var(--text-grey)' }}>Track and manage your orders, {user?.name?.split(' ')[0]}</p>
        </div>
        <Link to="/" className="btn btn-outline" style={{ padding: '10px 20px' }}>+ Shop More</Link>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📦</div>
          <h3 style={{ marginBottom: '8px' }}>No orders yet</h3>
          <p style={{ color: 'var(--text-grey)', marginBottom: '24px' }}>You haven't placed any orders yet. Start shopping!</p>
          <Link to="/" className="btn">Browse Medicines</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map(order => {
            const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;
            const isExpanded = expandedOrder === order._id;
            return (
              <div key={order._id} className="order-card" id={`order-${order._id}`}>
                {}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', marginBottom: '4px' }}>Order ID</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.9rem' }}>#{order._id.slice(-10).toUpperCase()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', marginBottom: '4px' }}>Date</p>
                    <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{new Date(order.createdAt).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' })}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', marginBottom: '4px' }}>Total</p>
                    <p style={{ fontWeight: '700', color: 'var(--primary-deep)' }}>PKR {order.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', marginBottom: '4px' }}>Items</p>
                    <p style={{ fontWeight: '600' }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="status-badge" style={{ color: statusConf.color, background: statusConf.bg }}>
                    {statusConf.icon} {order.status}
                  </span>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                    id={`toggle-order-${order._id}`}
                  >
                    {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                  </button>
                </div>

                {}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '20px', paddingTop: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      {}
                      <div>
                        <h4 style={{ marginBottom: '12px', color: 'var(--primary-deep)' }}>Ordered Items</h4>
                        {order.items?.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {item.image && <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: '#f9f9f9' }} />}
                              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</span>
                            </div>
                            <span style={{ color: 'var(--text-grey)', fontSize: '0.85rem' }}>× {item.quantity} = PKR {(item.price * item.quantity)?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {}
                      <div>
                        <h4 style={{ marginBottom: '12px', color: 'var(--primary-deep)' }}>Shipping Address</h4>
                        {order.shippingAddress ? (
                          <div style={{ color: 'var(--text-grey)', lineHeight: '1.8', fontSize: '0.9rem' }}>
                            <p style={{ fontWeight: '600', color: '#333' }}>{order.shippingAddress.fullName}</p>
                            <p>📞 {order.shippingAddress.phone}</p>
                            <p>{order.shippingAddress.street}</p>
                            <p>{order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}</p>
                            <p>{order.shippingAddress.zip}, {order.shippingAddress.country}</p>
                          </div>
                        ) : (
                          <p style={{ color: 'var(--text-grey)' }}>No shipping address recorded</p>
                        )}
                        <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-grey)' }}>Payment: {order.paymentMethod || 'Stripe'}</p>
                          <p style={{ fontSize: '0.85rem', color: order.isPaid ? 'var(--primary-green)' : '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
                            {order.isPaid ? '✓ Paid' : '⏳ Payment Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;