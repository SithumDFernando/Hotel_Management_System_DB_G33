import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function NotFound() {
  const { user, isAuthenticated } = useAuth();
  const staff = isAuthenticated && user.role !== 'guest';
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-[32px] font-semibold leading-tight text-ink-900">Page not found</h1>
      <p className="mt-3 text-ink-600">This address doesn’t match any page. Check the link, or go to the home page.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {staff ? (
          <Button variant="secondary" to={homeForRole(user.role)}>
            {user.role === 'receptionist' ? 'Go to Today' : 'Go to your dashboard'}
          </Button>
        ) : (
          <Button variant="secondary" to="/">Go to home page</Button>
        )}
      </div>
    </div>
  );
}
