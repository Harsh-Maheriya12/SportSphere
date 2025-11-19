import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (!token) return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

export default AdminProtectedRoute;
