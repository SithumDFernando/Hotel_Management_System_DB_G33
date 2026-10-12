import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';

// roles: allowed roles. Unauthenticated -> /login (remembering where they were
// going); authenticated but wrong role -> their own home.
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return children;
}
