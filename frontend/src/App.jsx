import React from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material';
import { Box, CircularProgress, Typography } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useTheme } from './context/ThemeContext';
import { lightTheme, darkTheme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import NotificationManager from './components/common/NotificationManager';
import Footer from './components/common/Footer';
import Chatbot from './components/common/Chatbot';
import SocialFeed from './components/social/SocialFeed';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ScheduleCalendar from './components/schedule/ScheduleCalendar';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';


// Pages
import Home from './pages/Home';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Messages from './pages/Messages';
import NotificationsPage from './pages/Notifications';
import Settings from './pages/Settings';
import Guides from './pages/Guides';
import GuideProfile from './pages/GuideProfile';
import AdminWebhooks from './pages/AdminWebhooks';
import FlutterwaveCheckout from './pages/FlutterwaveCheckout';
import FlutterwaveReturn from './pages/FlutterwaveReturn';
import PayPalReturn from './pages/PayPalReturn';
import Call from './pages/Call';
import PaymentsAuthDebug from './pages/Dev/PaymentsAuthDebug';
import AdminDashboard from './components/dashboard/AdminDashboard';
import WalkerDashboard from './components/dashboard/WalkerDashboard';
import WalkeeDashboard from './components/dashboard/WalkeeDashboard';

const LegacyPaymentCallbackRedirect = () => {
  const location = useLocation();

  return (
    <Navigate
      to={{ pathname: '/flutterwave/return', search: location.search }}
      replace
    />
  );
};

const AuthLoadingWrapper = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Voya
          </Typography>
          <CircularProgress sx={{ mt: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  return children;
};

const ThemeWrapper = () => {
  const { resolvedTheme } = useTheme();
  const theme = createTheme(resolvedTheme === 'dark' ? darkTheme : lightTheme);

  return (
    <MUIThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <AuthLoadingWrapper>
          <Routes>
            <Route path="/login" element={<Landing initialAuthMode="login" />} />
            <Route path="/register" element={<Landing initialAuthMode="register" />} />
            <Route path="/flutterwave/checkout" element={<ProtectedRoute><FlutterwaveCheckout /></ProtectedRoute>} />
            <Route path="/flutterwave/return" element={<FlutterwaveReturn />} />
            <Route path="/payment-callback" element={<LegacyPaymentCallbackRedirect />} />
            <Route path="/paypal/return" element={<PayPalReturn />} />
            <Route path="/call/:id" element={<ProtectedRoute><Call /></ProtectedRoute>} />
            <Route path="/dev/debug" element={<ProtectedRoute><PaymentsAuthDebug /></ProtectedRoute>} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guides/:id" element={<GuideProfile />} />
            <Route path="/" element={<HomeRoute />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/admin/webhooks" element={<ProtectedRoute><AdminWebhooks /></ProtectedRoute>} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="profile" element={<Profile />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="messages" element={<Messages />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="social" element={<SocialFeed />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="schedule" element={<ScheduleCalendar />} />
            </Route>
          </Routes>
          <NotificationManager />
          <Footer />
          <Chatbot />
        </AuthLoadingWrapper>
      </Router>
    </MUIThemeProvider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth(); // Now this will work because we imported it

  if (loading) {
    return <div>Loading...</div>; // Prevents crashing while checking login
  }

  if (!user) {
    // If not logged in, show landing page and let the user choose login.
    return <Navigate to="/" />;
  }

  return children;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Landing />;
  }

  return <DashboardSwitch />;
};

const DashboardSwitch = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = (user.role || '').toLowerCase();

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'walker':
    case 'guide':
      return <WalkerDashboard />;
    case 'walkee':
    case 'traveler':
    case 'traveller':
      return <WalkeeDashboard />;
    default:
      return <Navigate to="/" />;
  }
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ThemeWrapper />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}



export default App;
