import { Navigate, Outlet } from 'react-router-dom';

import { LoadingScreen } from '@/components/common/loading-screen';
import { useAuth } from '@/features/auth/use-auth';

export function ProtectedRoute() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
