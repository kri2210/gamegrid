import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Loader from './components/Loader';

// Pages
import Landing       from './pages/Landing';
import Login         from './pages/Login';
import Register      from './pages/Register';
import Explore       from './pages/Explore';
import VenueDetail   from './pages/VenueDetail';
import Booking       from './pages/Booking';
import MyBookings    from './pages/MyBookings';
import Events        from './pages/Events';
import EventDetail   from './pages/EventDetail';

// Owner pages
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerVenues    from './pages/owner/Venues';
import OwnerVenueForm from './pages/owner/VenueForm';
import OwnerBookings  from './pages/owner/Bookings';
import OwnerSlots     from './pages/owner/Slots';
import OwnerEvents    from './pages/owner/Events';
import OwnerEventForm from './pages/owner/EventForm';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'owner' ? '/owner/dashboard' : '/explore'} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"        element={user ? <Navigate to={user.role === 'owner' ? '/owner/dashboard' : '/explore'} /> : <Landing />} />
        <Route path="/login"   element={user ? <Navigate to={user.role === 'owner' ? '/owner/dashboard' : '/explore'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'owner' ? '/owner/dashboard' : '/explore'} /> : <Register />} />

        {/* Player */}
        <Route path="/explore"          element={<ProtectedRoute role="player"><Explore /></ProtectedRoute>} />
        <Route path="/venue/:id"        element={<ProtectedRoute role="player"><VenueDetail /></ProtectedRoute>} />
        <Route path="/booking"          element={<ProtectedRoute role="player"><Booking /></ProtectedRoute>} />
        <Route path="/my-bookings"      element={<ProtectedRoute role="player"><MyBookings /></ProtectedRoute>} />
        <Route path="/events"           element={<ProtectedRoute role="player"><Events /></ProtectedRoute>} />
        <Route path="/events/:id"       element={<ProtectedRoute role="player"><EventDetail /></ProtectedRoute>} />

        {/* Owner */}
        <Route path="/owner/dashboard"        element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/owner/venues"           element={<ProtectedRoute role="owner"><OwnerVenues /></ProtectedRoute>} />
        <Route path="/owner/venues/add"       element={<ProtectedRoute role="owner"><OwnerVenueForm /></ProtectedRoute>} />
        <Route path="/owner/venues/:id/edit"  element={<ProtectedRoute role="owner"><OwnerVenueForm /></ProtectedRoute>} />
        <Route path="/owner/bookings"         element={<ProtectedRoute role="owner"><OwnerBookings /></ProtectedRoute>} />
        <Route path="/owner/slots"            element={<ProtectedRoute role="owner"><OwnerSlots /></ProtectedRoute>} />
        <Route path="/owner/events"           element={<ProtectedRoute role="owner"><OwnerEvents /></ProtectedRoute>} />
        <Route path="/owner/events/create"    element={<ProtectedRoute role="owner"><OwnerEventForm /></ProtectedRoute>} />
        <Route path="/owner/events/:id/edit"  element={<ProtectedRoute role="owner"><OwnerEventForm /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a2235', color: '#f0f4ff', border: '1px solid rgba(255,255,255,0.1)' },
            success: { iconTheme: { primary: '#00ff88', secondary: '#080c12' } },
            error:   { iconTheme: { primary: '#ff4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
