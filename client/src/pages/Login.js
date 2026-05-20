import React, { useState, useContext } from 'react';
import axios from 'axios';
import { StoreContext } from '../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(StoreContext);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      login(data);
      navigate('/');
    } catch (err) {
      alert('Invalid credentials');
    }
  };
  return (
    <div className="container">
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <h1 style={{marginBottom: '25px', color: 'var(--primary-deep)'}}>Login</h1>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn" style={{width: '100%', padding: '15px'}}>Login to Account</button>
          <p style={{marginTop: '20px', textAlign: 'center', color: 'var(--text-grey)'}}>Don't have an account? <Link to="/register" style={{color: 'var(--primary-green)', fontWeight: '600'}}>Register Now</Link></p>
        </form>
      </div>
    </div>
  );
};
export default Login;