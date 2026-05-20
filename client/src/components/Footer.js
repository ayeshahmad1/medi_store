import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>MediStore</h4>
            <p>Your trusted partner in healthcare. Providing 100% authentic medicines and healthcare products at your doorstep.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Shop Medicines</Link></li>
              <li><Link to="/cart">My Cart</Link></li>
              <li><Link to="/login">Login / Register</Link></li>
              <li><Link to="/admin">Dashboard</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Customer Service</h4>
            <ul>
              <li><Link to="/">Help Center</Link></li>
              <li><Link to="/">Returns Policy</Link></li>
              <li><Link to="/">Shipping Info</Link></li>
              <li><Link to="/">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact Us</h4>
            <p>Email: support@medistore.pk</p>
            <p>Phone: +92 300 1234567</p>
            <p>Address: Main Boulevard, Gulberg III, Lahore, Pakistan</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 MediStore Pakistan. All Rights Reserved. Built for Excellence.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;