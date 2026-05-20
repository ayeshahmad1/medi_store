import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';

export const ProtectedRoute = ({ children }) => {
  const { user } = useContext(StoreContext);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { user } = useContext(StoreContext);
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;