import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import Home from '@/pages/Home';
import RoomsBrowse from '@/pages/RoomsBrowse';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import BookingCheckout from '@/pages/BookingCheckout';
import MyBookings from '@/pages/MyBookings';
import Profile from '@/pages/Profile';
import ServiceRequest from '@/pages/ServiceRequest';
import ReceptionistDashboard from '@/pages/ReceptionistDashboard';
import Spinner from '@/components/ui/Spinner';
import NotFound from '@/pages/NotFound';

// Chart-heavy dashboards are split out so public pages stay light.
const ManagerDashboard = lazy(() => import('@/pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));

const Lazy = ({ children }) => (
  <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>}>{children}</Suspense>
);

// Route map: docs/specs/09_frontend_pages.md (+ /register and /my-bookings).
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rooms" element={<RoomsBrowse />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route
          path="booking/:roomId"
          element={
            <ProtectedRoute roles={['guest', 'receptionist', 'manager']}>
              <BookingCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-bookings"
          element={
            <ProtectedRoute roles={['guest']}>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute roles={['guest', 'receptionist', 'manager', 'admin']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/:bookingId"
          element={
            <ProtectedRoute roles={['receptionist', 'manager']}>
              <ServiceRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/receptionist"
          element={
            <ProtectedRoute roles={['receptionist']}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/manager"
          element={
            <ProtectedRoute roles={['manager']}>
              <Lazy><ManagerDashboard /></Lazy>
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <Lazy><AdminDashboard /></Lazy>
            </ProtectedRoute>
          }
        />
        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
