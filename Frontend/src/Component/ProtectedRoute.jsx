import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ roles, children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};
