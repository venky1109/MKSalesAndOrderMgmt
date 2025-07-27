// src/auth/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function ProtectedRoute({ role, children }) {
  const user = useSelector((state) => state.posUser.userInfo);

  if (!user || !user.token) return <Navigate to="/login" />;

  const allowedRoles = Array.isArray(role) ? role : [role];
  return allowedRoles.includes(user.role) ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;
