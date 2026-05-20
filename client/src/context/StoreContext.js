import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart')) || []);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => { localStorage.setItem('user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const fetchWishlist = useCallback(async () => {
    if (!user?.token) { setWishlist([]); return; }
    try {
      const { data } = await api.get('/wishlist');
      setWishlist(data);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    }
  }, [user?.token]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const login = (userData) => {
    setUser(userData);

    if (userData.wishlist) setWishlist(userData.wishlist);
  };

  const logout = () => {
    setUser(null);
    setCart([]);
    setWishlist([]);
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
  };

  const addToCart = (product) => {
    const exist = cart.find(x => x._id === product._id);
    if (exist) {
      setCart(cart.map(x => x._id === product._id ? { ...exist, quantity: exist.quantity + 1 } : x));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };
  const removeFromCart = (id) => setCart(cart.filter(x => x._id !== id));
  const updateQuantity = (id, q) => {
    if (q < 1) { removeFromCart(id); return; }
    setCart(cart.map(x => x._id === id ? { ...x, quantity: q } : x));
  };
  const clearCart = () => setCart([]);

  const toggleWishlist = async (product) => {
    if (!user) return false;
    try {
      const { data } = await api.post(`/wishlist/${product._id}`);
      if (data.inWishlist) {
        setWishlist(prev => [...prev, product]);
      } else {
        setWishlist(prev => prev.filter(p => p._id !== product._id));
      }
      return data.inWishlist;
    } catch (err) {
      console.error('Wishlist error:', err);
      return false;
    }
  };

  const isInWishlist = (productId) => wishlist.some(p => p._id === productId);

  return (
    <StoreContext.Provider value={{
      user, login, logout,
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      wishlist, toggleWishlist, isInWishlist, fetchWishlist,
      searchQuery, setSearchQuery,
      categoryFilter, setCategoryFilter
    }}>
      {children}
    </StoreContext.Provider>
  );
};