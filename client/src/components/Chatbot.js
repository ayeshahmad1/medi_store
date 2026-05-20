import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import api from '../utils/api';

const INITIAL_MESSAGE = {
  id: 1,
  from: 'bot',
  message: `👋 Assalamu Alaikum! I'm **MediBot** — your AI-powered pharmacy assistant!\n\nPowered by Google Gemini AI, I can:\n• 🔍 Find any medicine by name or symptom\n• 💰 Filter by your budget\n• 📦 Track your orders in real-time\n• 💊 Give personalized recommendations\n• 🎁 Share exclusive discount codes\n• ❓ Answer all your questions\n\nWhat can I help you with today?`,
  quickReplies: ['🔍 Search Medicine', '📦 Track My Order', '💊 Popular Medicines', '🎁 Discount Codes'],
  showProducts: false, showOrders: false, showCoupons: false,
  products: [], orders: [], coupons: [],
  time: new Date(),
};

const STATUS_CONFIG = {
  Pending: { color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  Shipped: { color: '#3b82f6', bg: '#dbeafe', icon: '🚚' },
  Delivered: { color: '#10b981', bg: '#d1fae5', icon: '✅' },
  Cancelled: { color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

const parseBold = (text) => {
  if (!text) return '';
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
};

const TypingIndicator = () => (
  <div className="cb-msg cb-msg-bot">
    <div className="cb-avatar">🤖</div>
    <div className="cb-bubble cb-typing"><span /><span /><span /></div>
  </div>
);

const StarRating = ({ rating = 4 }) => {
  const s = Math.max(0, Math.min(5, Math.round(rating)));
  return <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>{'★'.repeat(s)}{'☆'.repeat(5 - s)}</span>;
};

const Chatbot = () => {
  const { user, cart, addToCart, removeFromCart } = useContext(StoreContext);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);

  const [conversationHistory, setConversationHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);
  const [cartReminderShown, setCartReminderShown] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;
    setHasUnread(false);
    setTimeout(() => inputRef.current?.focus(), 250);
    if (cart.length > 0 && !cartReminderShown) {
      setCartReminderShown(true);
      const total = cart.reduce((a, c) => a + c.price * c.quantity, 0);
      setTimeout(() => {
        addBotMsg({
          message: `🛒 Hey! You have **${cart.length} item${cart.length > 1 ? 's' : ''}** waiting in your cart — total **PKR ${total.toLocaleString()}**.\n\nShall I take you to checkout?`,
          quickReplies: ['➡️ Checkout Now', '🛒 View Cart', '🔍 Keep Shopping'],
          showProducts: false, showOrders: false, showCoupons: false,
          products: [], orders: [], coupons: [],
          action: null,
          isCartReminder: true,
        });
      }, 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addBotMsg = useCallback((data) => {
    const msg = { id: Date.now(), from: 'bot', time: new Date(), ...data };
    setMessages(prev => [...prev, msg]);

    setConversationHistory(prev => [...prev, { from: 'bot', message: data.message }]);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const { data } = await api.get(`/chatbot/suggestions?q=${encodeURIComponent(q)}`);
      setSuggestions(data);
    } catch { setSuggestions([]); }
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 280);
  };

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isTyping) return;
    setInput('');
    setSuggestions([]);

    const userMsg = { id: Date.now(), from: 'user', message: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setConversationHistory(prev => [...prev, { from: 'user', message: msg }]);

    setIsTyping(true);

    try {
      const { data } = await api.post('/chatbot/message', {
        message: msg,
        userId: user?._id || null,
        conversationHistory: conversationHistory.slice(-8),
        cart: cart.map(item => ({ id: item._id, name: item.name, price: item.price, quantity: item.quantity })),
      });
      setIsTyping(false);

      if (data.action?.type === 'ADD_TO_CART' && data.action.product) {
        addToCart(data.action.product);
      } else if (data.action?.type === 'REMOVE_FROM_CART' && data.action.productId) {
        removeFromCart(data.action.productId);
      }

      addBotMsg(data);
    } catch (err) {
      setIsTyping(false);
      addBotMsg({
        message: '⚠️ Network error. Please check your connection and try again.',
        quickReplies: ['🔍 Search Medicine', '❓ Help'],
        showProducts: false, showOrders: false, showCoupons: false,
        products: [], orders: [], coupons: [], action: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isTyping, user, conversationHistory, addBotMsg]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') setSuggestions([]);
  };

  const handleQuickReply = (reply) => {

    const navMap = {
      '🛒 View Cart': '/cart',
      '➡️ Checkout Now': '/checkout',
      '➡️ Go to Checkout': '/checkout',
      '📦 View All Orders': '/orders',
    };
    if (navMap[reply]) { navigate(navMap[reply]); setIsOpen(false); return; }

    const clean = reply.replace(/^[\u{1F300}-\u{1FAD6}][\s]*/u, '').trim();
    sendMessage(clean || reply);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    addBotMsg({
      message: `✅ **${product.name}** added to cart!\n\nAnything else I can help you find?`,
      quickReplies: ['🛒 View Cart', '➡️ Checkout Now', '🔍 Search More'],
      showProducts: false, showOrders: false, showCoupons: false,
      products: [], orders: [], coupons: [], action: null,
    });
  };

  const handleNavigate = (path) => { navigate(path); setIsOpen(false); };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setConversationHistory([]);
    setCartReminderShown(false);
  };

  const renderMessage = (msg) => {
    if (msg.from === 'user') {
      return (
        <div key={msg.id} className="cb-msg cb-msg-user">
          <div className="cb-bubble cb-bubble-user">{msg.message}</div>
          <div className="cb-avatar-user">{user?.name?.charAt(0).toUpperCase() || '👤'}</div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="cb-msg cb-msg-bot" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
          <div className="cb-avatar">🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>

            { }
            {msg.message && (
              <div className="cb-bubble cb-bubble-bot">
                {msg.message.split('\n').map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {parseBold(line)}
                    {i < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            )}

            { }
            {msg.showProducts && msg.products?.length > 0 && (
              <div className="cb-products-grid">
                {msg.products.map(p => (
                  <div key={p._id} className="cb-product-card">
                    <img
                      src={p.image} alt={p.name} className="cb-product-img"
                      onError={e => { e.target.src = 'https://placehold.co/60x60?text=💊'; }}
                    />
                    <div className="cb-product-info">
                      <p className="cb-product-name">{p.name}</p>
                      <StarRating rating={p.rating} />
                      <p className="cb-product-price">PKR {p.price?.toLocaleString()}</p>
                      <span className={`cb-product-stock ${p.stock > 10 ? 'in' : p.stock > 0 ? 'low' : 'out'}`}>
                        {p.stock > 10 ? '✓ In Stock' : p.stock > 0 ? `Only ${p.stock} left!` : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="cb-product-actions">
                      <button onClick={() => handleNavigate(`/product/${p._id}`)} className="cb-btn-detail" id={`cb-view-${p._id}`}>View</button>
                      {p.stock > 0 && (
                        <button onClick={() => handleAddToCart(p)} className="cb-btn-cart" id={`cb-add-${p._id}`}>+Cart</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            { }
            {msg.showOrders && msg.orders?.length > 0 && (
              <div className="cb-orders-list">
                {msg.orders.map(o => {
                  const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.Pending;
                  return (
                    <div key={o.id} className="cb-order-card" id={`cb-order-${o.id}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem', color: '#05231b' }}>
                            #{o.shortId}
                          </span>
                          <p style={{ fontSize: '0.72rem', color: '#999', margin: '2px 0 0' }}>
                            {new Date(o.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="cb-status-badge" style={{ color: sc.color, background: sc.bg }}>
                          {sc.icon} {o.status}
                        </span>
                      </div>
                      {o.items?.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          {o.items.map((item, i) => (
                            <p key={i} style={{ fontSize: '0.75rem', color: '#777', margin: '1px 0' }}>
                              • {item.name} × {item.quantity}
                            </p>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#05231b', fontSize: '0.9rem' }}>PKR {o.totalAmount?.toLocaleString()}</strong>
                        <button onClick={() => handleNavigate('/orders')} className="cb-btn-detail" style={{ fontSize: '0.72rem' }}>Details →</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            { }
            {msg.showCoupons && msg.coupons?.length > 0 && (
              <div className="cb-coupons-list">
                {msg.coupons.map((c, i) => (
                  <div key={i} className="cb-coupon-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <code className="cb-coupon-code" style={{ color: c.color }}>{c.code}</code>
                      <span className="cb-coupon-discount" style={{ background: c.color }}>{c.discount}</span>
                    </div>
                    <p className="cb-coupon-desc">{c.desc}</p>
                    <p className="cb-coupon-min">Min. order: PKR {c.minOrder?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            { }
            {msg.isCartReminder && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => handleNavigate('/checkout')} className="cb-btn-cart" style={{ flex: 1 }}>🛒 Checkout</button>
                <button onClick={() => handleNavigate('/cart')} className="cb-btn-detail" style={{ flex: 1 }}>View Cart</button>
              </div>
            )}

            { }
            {msg.action?.type === 'NAVIGATE' && (
              <button onClick={() => handleNavigate(msg.action.path)} className="cb-action-btn" style={{ marginTop: '8px' }}>
                {msg.action.path === '/login' ? '🔐 Sign In' : msg.action.path === '/cart' ? '🛒 Go to Cart' : '→ Continue'}
              </button>
            )}

          </div>
        </div>

        { }
        {msg.quickReplies?.length > 0 && (
          <div className="cb-quick-replies">
            {msg.quickReplies.map((qr, i) => (
              <button key={i} className="cb-qr-btn" onClick={() => handleQuickReply(qr)} id={`cb-qr-${msg.id}-${i}`}>
                {qr}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      { }
      <button
        className={`cb-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        id="chatbot-fab"
        title="Chat with MediBot AI"
        aria-label="Open MediBot chat"
      >
        {isOpen ? '✕' : '💬'}
        {hasUnread && !isOpen && <span className="cb-fab-badge">AI</span>}
      </button>

      { }
      {isOpen && (
        <div className="cb-panel" id="chatbot-panel" role="dialog" aria-label="MediBot Chat">

          { }
          <div className="cb-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="cb-bot-avatar">🤖</div>
              <div>
                <p className="cb-bot-name">MediBot AI</p>
                <p className="cb-bot-status">
                  <span className="cb-online-dot" />
                  Powered by Google Gemini AI
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={clearChat} className="cb-header-btn" title="Clear conversation">🗑</button>
              <button onClick={() => setIsOpen(false)} className="cb-header-btn" title="Close chat">✕</button>
            </div>
          </div>

          { }
          <div style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)', height: '2px' }} />

          { }
          <div className="cb-messages" id="chatbot-messages">
            {messages.map(renderMessage)}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          { }
          {suggestions.length > 0 && (
            <div className="cb-suggestions">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="cb-suggestion-item"
                  onClick={() => { sendMessage(s.name); setSuggestions([]); }}
                  id={`cb-suggest-${i}`}
                >
                  <span style={{ fontSize: '0.85rem' }}>💊 {s.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{s.category} • PKR {s.price}</span>
                </div>
              ))}
            </div>
          )}

          { }
          <div className="cb-input-bar">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about medicines..."
              className="cb-input"
              id="chatbot-input"
              autoComplete="off"
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage()}
              className="cb-send-btn"
              disabled={!input.trim() || isTyping}
              id="chatbot-send"
            >
              ➤
            </button>
          </div>
          <p className="cb-footer-text">🤖 Powered by Google Gemini AI • MediStore {new Date().getFullYear()}</p>
        </div>
      )}
    </>
  );
};

export default Chatbot;