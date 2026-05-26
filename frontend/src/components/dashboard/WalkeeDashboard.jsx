import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  Chip,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Rating
} from '@mui/material';
import {
  Add,
  Public,
  Schedule,
  AttachMoney,
  Star,
  AccessTime,
  Notifications,
  TrendingUp,
  ChevronRight,
  CalendarToday,
  Message,
  TravelExplore,
  CheckCircle,
  Edit
} from '@mui/icons-material';
import { taskAPI, guideAPI, paymentAPI, complaintAPI } from '../../services/api';
import { formatCurrency, formatDate, calculateDistance } from '../../utils/helpers';
import { useSocket } from '../../context/SocketContext';
import TaskMap from '../tasks/TaskMap';
import DashboardHeader from '../common/DashboardHeader';
import FlutterwaveCheckoutButton from '../payment/FlutterwaveCheckoutButton';

const WalkeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const dashboardLoadedRef = React.useRef(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalSpent: 0,
    favoriteGuides: 0
  });
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [recentGuides, setRecentGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyGuides, setNearbyGuides] = useState([]);
  const [actionStatus, setActionStatus] = useState(null);
  const [certifiedGuides, setCertifiedGuides] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [feedbackQueue, setFeedbackQueue] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [etaByTaskId, setEtaByTaskId] = useState({});
  const [guideLocationsByTaskId, setGuideLocationsByTaskId] = useState({});
  const [coinWalletBalance, setCoinWalletBalance] = useState(0);
  const [coinTransactions, setCoinTransactions] = useState([]);
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, task: null });
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, feedback: '', complaint: false });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [tripEditDialog, setTripEditDialog] = useState({ open: false, task: null });
  const [tripEditForm, setTripEditForm] = useState({ scheduled_time: '', notes: '' });
  const [tripEditSubmitting, setTripEditSubmitting] = useState(false);
  const [tripEditError, setTripEditError] = useState('');

  const isPaymentRequired = (task) => {
    if (task?.requires_payment) return true;
    const paymentStatus = String(task?.payment_status || task?.paymentStatus || '').toLowerCase();
    if (paymentStatus && paymentStatus !== 'completed') return true;
    const status = String(task?.status || '').toLowerCase();
    const isApproved = Boolean(task?.is_approved || task?.approved_at);
    return isApproved && status === 'assigned' && !paymentStatus;
  };

  const isTransportFacilitationRequired = (task) => Boolean(task?.transport_facilitation_required);

  const getGuidedEtaMinutes = (taskId) => {
    const entry = etaByTaskId[taskId];
    if (typeof entry === 'number') return entry;
    if (entry && typeof entry === 'object') {
      return entry.durationRemaining ?? entry.eta ?? null;
    }
    return null;
  };

  const getGuidedMessage = (taskId) => {
    const entry = etaByTaskId[taskId];
    return entry && typeof entry === 'object' ? entry.message : null;
  };

  const getPaymentButtonCopy = (task) => {
    if (isTransportFacilitationRequired(task)) {
      return {
        label: 'Pay motorbike support with Flutterwave',
        message: task.transport_eta_minutes
          ? `Nearest guide is ${task.transport_distance_km || '1+'} km away. ETA about ${task.transport_eta_minutes} min. Transport fee: ${formatCurrency(task.transport_fee || task.price || 0)}.`
          : `Nearest guide is more than 1 km away. Transport fee: ${formatCurrency(task.transport_fee || task.price || 0)}.`
      };
    }

    return {
      label: 'Pay with Flutterwave',
      message: 'Complete payment to activate your trip.'
    };
  };

  const canCompleteTrip = (task) => {
    const status = String(task?.status || '').toLowerCase();
    if (status !== 'assigned' && status !== 'in_progress') return false;
    return !isPaymentRequired(task);
  };

  const mapMarkers = [
    currentLocation
      ? {
          id: 'traveler-current-location',
          title: 'You',
          description: 'Your current location',
          markerType: 'traveler',
          pointKind: 'traveler_self',
          latitude: currentLocation.lat,
          longitude: currentLocation.lng
        }
      : null,
    ...nearbyGuides.map((guide) => ({
      id: `guide-${guide.id}`,
      title: guide.name,
      description: guide.description,
      markerType: guide.markerType || 'walker',
      pointKind: 'guide',
      latitude: guide.latitude,
      longitude: guide.longitude,
      distanceKm: guide.distance
    })),
    ...upcomingTrips.flatMap((trip) => {
      const markers = [];
      const pickupLocation = trip.pickup_location || trip.location || null;
      const pickupLat = Number(pickupLocation?.lat ?? pickupLocation?.latitude);
      const pickupLng = Number(pickupLocation?.lng ?? pickupLocation?.longitude);

      if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
        markers.push({
          id: `pickup-${trip.id}`,
          taskRef: trip.id,
          title: trip.description || 'Traveler pickup',
          travelerName: user?.name || 'Traveler',
          guideName: trip.Walker?.name || trip.walker?.name || null,
          phone: trip.Walker?.phone || trip.walker?.phone || null,
          description: isTransportFacilitationRequired(trip)
            ? `Motorbike support requested${trip.transport_fee ? ` • ${formatCurrency(trip.transport_fee)}` : ''}`
            : 'Traveler pickup point',
          markerType: isTransportFacilitationRequired(trip) ? 'motorcycle' : 'traveler',
          pointKind: 'pickup',
          latitude: pickupLat,
          longitude: pickupLng,
          distanceKm: currentLocation
            ? calculateDistance(currentLocation.lat, currentLocation.lng, pickupLat, pickupLng, 'km')
            : null,
          paidAmount: String(trip.payment_status || '').toLowerCase() === 'completed'
            ? Number(trip.transport_fee || trip.price || 0)
            : 0,
          destinationAddress: trip.destination?.address || trip.destination_location || null,
          scheduledTime: formatDate(trip.scheduled_time || trip.scheduledTime, 'short'),
          weather: trip.weather || null,
          transportFee: trip.transport_fee || null,
          etaRemainingMinutes: getGuidedEtaMinutes(trip.id)
        });
      }

      const guideLocation = guideLocationsByTaskId[trip.id];
      if (guideLocation && Number.isFinite(Number(guideLocation.lat)) && Number.isFinite(Number(guideLocation.lng))) {
        const distanceKm = currentLocation
          ? calculateDistance(currentLocation.lat, currentLocation.lng, guideLocation.lat, guideLocation.lng, 'km')
          : trip.transport_distance_km || null;

        markers.push({
          id: `guide-live-${trip.id}`,
          taskRef: trip.id,
          title: trip.Walker?.name || trip.walker?.name || 'Guide',
          travelerName: user?.name || 'Traveler',
          guideName: trip.Walker?.name || trip.walker?.name || 'Guide',
          phone: trip.Walker?.phone || trip.walker?.phone || null,
          description: isTransportFacilitationRequired(trip)
            ? `Guide is moving with traveler transport support${Number.isFinite(Number(distanceKm)) ? ` • ${Number(distanceKm).toFixed(1)} km away` : ''}`
            : getGuidedMessage(trip.id) || `Guide ETA ${getGuidedEtaMinutes(trip.id) ?? 'N/A'} min`,
          markerType: isTransportFacilitationRequired(trip) ? 'motorcycle' : 'walker',
          pointKind: 'guide',
          latitude: Number(guideLocation.lat),
          longitude: Number(guideLocation.lng),
          distanceKm,
          paidAmount: String(trip.payment_status || '').toLowerCase() === 'completed'
            ? Number(trip.transport_fee || trip.price || 0)
            : 0,
          destinationAddress: trip.destination?.address || trip.destination_location || null,
          scheduledTime: formatDate(trip.scheduled_time || trip.scheduledTime, 'short'),
          weather: trip.weather || null,
          etaRemainingMinutes: getGuidedEtaMinutes(trip.id),
          transportFee: trip.transport_fee || null
        });
      }

      if (trip.destination && Number.isFinite(Number(trip.destination.lat)) && Number.isFinite(Number(trip.destination.lng))) {
        markers.push({
          id: `destination-${trip.id}`,
          taskRef: trip.id,
          title: 'Destination',
          travelerName: user?.name || 'Traveler',
          guideName: trip.Walker?.name || trip.walker?.name || null,
          phone: trip.Walker?.phone || trip.walker?.phone || null,
          description: trip.destination.address || 'Trip destination',
          markerType: 'destination',
          pointKind: 'destination',
          latitude: Number(trip.destination.lat),
          longitude: Number(trip.destination.lng),
          paidAmount: String(trip.payment_status || '').toLowerCase() === 'completed'
            ? Number(trip.transport_fee || trip.price || 0)
            : 0,
          destinationAddress: trip.destination?.address || trip.destination_location || null,
          scheduledTime: formatDate(trip.scheduled_time || trip.scheduledTime, 'short'),
          weather: trip.weather || null
        });
      }

      return markers;
    })
  ].filter(Boolean);

  const nearestGuideEtaMinutes = upcomingTrips
    .map((trip) => getGuidedEtaMinutes(trip.id))
    .filter((minutes) => Number.isFinite(Number(minutes)))
    .sort((a, b) => Number(a) - Number(b))[0];

  useEffect(() => {
    if (!user?.id) return;
    if (dashboardLoadedRef.current) return;
    dashboardLoadedRef.current = true;
    fetchDashboardData();
    fetchCoinWalletBalance();
    fetchCoinWalletHistory();
  }, [user?.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err)
    );
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDashboardData({ silent: true });
    socket.on('task_update', handleUpdate);
    socket.on('task_updated', handleUpdate);
    socket.on('new_task', handleUpdate);
    socket.on('system_notification', handleUpdate);
    socket.on('payment_received', handleUpdate);

    // Listen for live guide location updates
    socket.on('guide_location_update', (data) => {
      setGuideLocationsByTaskId((prev) => ({
        ...prev,
        [data.taskId]: data.guideLocation
      }));

      // Update ETA
      if (data.eta) {
        setEtaByTaskId((prev) => ({
          ...prev,
          [data.taskId]: {
            eta: data.eta,
            message: data.message,
            distanceRemaining: data.distanceRemaining,
            durationRemaining: data.durationRemaining
          }
        }));
      }
    });

    return () => {
      socket.off('task_update', handleUpdate);
      socket.off('task_updated', handleUpdate);
      socket.off('new_task', handleUpdate);
      socket.off('system_notification', handleUpdate);
      socket.off('payment_received', handleUpdate);
      socket.off('guide_location_update', () => {});
    };
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNearbyGuideData = async () => {
      if (!currentLocation) {
        return;
      }

      try {
        const nearbyResponse = await taskAPI.nearBy(currentLocation.lat, currentLocation.lng, 5000);
        const walkers = nearbyResponse.data?.walkers || [];
        setNearbyGuides(walkers.map((walker) => ({
          id: walker.id,
          name: walker.name,
          title: walker.name,
          markerType: 'walker',
          distance: walker.distance_km,
          latitude:
            walker.location?.latitude
            ?? walker.location?.lat
            ?? walker.location?.coordinates?.[1],
          longitude:
            walker.location?.longitude
            ?? walker.location?.lng
            ?? walker.location?.coordinates?.[0],
          description: walker.is_certified
            ? `Certified guide nearby${walker.distance_km ? ` • ${walker.distance_km} km away` : ''}`
            : `Guide nearby${walker.distance_km ? ` • ${walker.distance_km} km away` : ''}`
        })));
      } catch (error) {
        console.error('Error fetching nearby guides:', error);
      }
    };

    fetchNearbyGuideData();
  }, [currentLocation]);

  const fetchTrackingForTasks = async (activeTrips) => {
    if (!Array.isArray(activeTrips) || activeTrips.length === 0) {
      setEtaByTaskId({});
      return;
    }

    const results = await Promise.all(
      activeTrips.map(async (trip) => {
        try {
          const response = await taskAPI.getTracking(trip.id);
          const eta = response.data?.tracking?.eta_minutes;
          return [trip.id, typeof eta === 'number' ? eta : null];
        } catch (error) {
          return [trip.id, null];
        }
      })
    );

    setEtaByTaskId(Object.fromEntries(results));
  };

  const openFeedbackDialog = (task) => {
    setFeedbackDialog({ open: true, task });
    setFeedbackForm({ rating: 5, feedback: '', complaint: false });
    setFeedbackError('');
  };

  const openTripEditDialog = (task) => {
    setTripEditDialog({ open: true, task });
    setTripEditForm({
      scheduled_time: task?.scheduled_time ? new Date(task.scheduled_time).toISOString().slice(0, 16) : '',
      notes: task?.notes || ''
    });
    setTripEditError('');
  };

  const submitTripEdit = async () => {
    const taskId = tripEditDialog.task?.id ?? tripEditDialog.task?.task_id;
    if (!taskId) {
      setTripEditError('Select a pending trip to edit.');
      return;
    }

    if (!tripEditForm.scheduled_time && !String(tripEditForm.notes || '').trim()) {
      setTripEditError('Update the trip date or notes before saving.');
      return;
    }

    try {
      setTripEditSubmitting(true);
      setTripEditError('');

      await taskAPI.updateUpcomingTrip(taskId, {
        scheduled_time: tripEditForm.scheduled_time || undefined,
        notes: String(tripEditForm.notes || '').trim()
      });

      setActionStatus({ severity: 'success', message: 'Upcoming trip updated successfully.' });
      setTripEditDialog({ open: false, task: null });
      fetchDashboardData({ silent: true });
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to update your trip.';
      setTripEditError(message);
      setActionStatus({ severity: 'error', message });
    } finally {
      setTripEditSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    const taskId = feedbackDialog.task?.id ?? feedbackDialog.task?.task_id;
    if (!taskId) {
      setFeedbackError('Select a completed trip before submitting feedback.');
      return;
    }

    const normalizedRating = Number(feedbackForm.rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      setFeedbackError('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (feedbackForm.complaint && !String(feedbackForm.feedback || '').trim()) {
      setFeedbackError('Please add a short complaint note so admin can review it.');
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setFeedbackError('');

      const payload = {
        rating: Math.max(1, Math.min(5, Math.round(normalizedRating))),
        feedback: String(feedbackForm.feedback || '').trim(),
        complaint: Boolean(feedbackForm.complaint)
      };

      if (feedbackForm.complaint) {
        await complaintAPI.create({ task_id: taskId, ...payload });
      } else {
        await taskAPI.submitFeedback(taskId, payload);
      }

      setActionStatus({
        severity: 'success',
        message: feedbackForm.complaint
          ? 'Feedback submitted and complaint sent to admin.'
          : 'Feedback submitted successfully.'
      });
      setFeedbackDialog({ open: false, task: null });
      fetchDashboardData({ silent: true });
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to submit feedback.';
      setFeedbackError(message);
      setActionStatus({
        severity: 'error',
        message
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCompleteTrip = async (trip) => {
    if (!trip?.id) return;

    try {
      await taskAPI.complete(trip.id, currentLocation || null, null);
      setActionStatus({
        severity: 'success',
        message: 'Trip marked completed. You can now leave feedback.'
      });
      fetchDashboardData({ silent: true });
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to complete trip right now.'
      });
    }
  };

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setActionStatus(null);
      }

      if (typeof taskAPI.getUserTasks === 'function' && user?.id) {
        const tasksResponse = await taskAPI.getUserTasks(user.id, 'Walkee');
        const tasks = tasksResponse.data?.tasks || tasksResponse.data || [];
        const upcoming = tasks.filter((task) => {
          if (isPaymentRequired(task)) return true;
          return task.status === 'pending' || task.status === 'assigned' || task.status === 'in_progress';
        });

        const completed = tasks.filter(task => task.status === 'completed');
        const feedbackPending = completed.filter((task) => !task.walkee_rating);
        const paymentsPending = tasks.filter((task) => isPaymentRequired(task));

        setStats({
          totalTrips: completed.length,
          upcomingTrips: upcoming.length,
          totalSpent: completed.reduce((sum, task) => sum + (task.price || 0), 0),
          favoriteGuides: 3
        });

        setUpcomingTrips(upcoming.slice(0, 3));
        setPendingPayments(paymentsPending.slice(0, 3));
        setFeedbackQueue(feedbackPending.slice(0, 3));
        setCompletedTrips(completed.slice(0, 5));
        fetchTrackingForTasks(upcoming.slice(0, 5));
      } else {
        setStats({
          totalTrips: 6,
          upcomingTrips: 2,
          totalSpent: 520,
          favoriteGuides: 3
        });
        setUpcomingTrips([]);
        setPendingPayments([]);
        setFeedbackQueue([]);
        setCompletedTrips([]);
      }

      setRecentGuides([
        { id: 1, name: 'Alex Kato', rating: 4.8, lastTrip: '2 days ago' },
        { id: 2, name: 'Sarah Johnson', rating: 4.9, lastTrip: '1 week ago' },
        { id: 3, name: 'Mike Chen', rating: 4.7, lastTrip: '2 weeks ago' }
      ]);

      try {
        const guideResponse = await guideAPI.list({ certified: true, limit: 6 });
        setCertifiedGuides(guideResponse.data?.guides || []);
      } catch (guideError) {
        console.error('Error fetching certified guides:', guideError);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!silent) {
        setActionStatus({ severity: 'error', message: 'Unable to refresh dashboard data.' });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchCoinWalletBalance = async () => {
    if (!user?.id) return;

    try {
      const response = await paymentAPI.getCoinWalletBalance(user.id);
      setCoinWalletBalance(Number(response.data?.coin_balance || 0));
    } catch (error) {
      console.error('Error fetching coin wallet balance:', error);
    }
  };

  const fetchCoinWalletHistory = async () => {
    if (!user?.id) return;

    try {
      const response = await paymentAPI.getCoinWalletTransactions(user.id, { limit: 5 });
      setCoinTransactions(response.data?.transactions || []);
    } catch (error) {
      console.error('Error fetching coin wallet history:', error);
    }
  };

  const fetchWalletHistory = async () => {
    if (!user?.id) return;

    try {
      setTransactionsLoading(true);
      const [historyResponse, transactionsResponse] = await Promise.all([
        payoutAPI.getHistory(),
        paymentAPI.getWalletTransactions(user.id, { limit: 10 })
      ]);
      setPayoutHistory(historyResponse.data?.data || historyResponse.data?.withdrawals || historyResponse.data?.payments || []);
      setWalletTransactions(transactionsResponse.data?.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet history:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Completed Trips',
      value: stats.totalTrips,
      icon: <TravelExplore />,
      color: '#0B6E99',
      change: '+3 this month'
    },
    {
      title: 'Upcoming Trips',
      value: stats.upcomingTrips,
      icon: <Schedule />,
      color: '#2FBF8F',
      change: 'Next: Tomorrow'
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: <AttachMoney />,
      color: '#F28C28',
      change: '+$120 this month'
    },
    {
      title: 'Favorite Guides',
      value: stats.favoriteGuides,
      icon: <Star />,
      color: '#7C5EF1',
      change: 'Most rated: 4.9'
    },
    {
      title: 'Coin Wallet',
      value: coinWalletBalance.toLocaleString(),
      icon: <AttachMoney />,
      color: '#0B6E99',
      change: 'Discounts and rewards'
    }
  ];

  if (loading) {
    return (
      <>
        <DashboardHeader title="Traveler Dashboard" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography>Loading dashboard...</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Traveler Dashboard" />
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 4,
            bgcolor: 'white',
            p: 3,
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <Box>

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome back, {user?.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here is your travel support overview
            </Typography>
          </Box>

        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={12}>
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <AttachMoney sx={{ color: '#0B6E99' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0B6E99' }}>
                    Coin Wallet Activity
                  </Typography>
                </Box>
                {coinTransactions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No coin activity yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {coinTransactions.slice(0, 5).map((entry) => (
                      <Box
                        key={entry.id}
                        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {entry.type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entry.description || (entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Recent activity')}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold" color={Number(entry.amount) >= 0 ? 'success.main' : 'error.main'}>
                          {Number(entry.amount) >= 0 ? `+${entry.amount}` : entry.amount}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Stats Cards Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#333' }}>
            Your Stats
          </Typography>
          <Grid container spacing={2}>
            {statsCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h3" sx={{ color: card.color, fontWeight: 700 }}>
                          {card.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {card.title}
                        </Typography>
                      </Box>
                      <Box sx={{
                        bgcolor: `${card.color}20`,
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: card.color
                      }}>
                        {card.icon}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp sx={{ color: '#2FBF8F', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" sx={{ color: '#2FBF8F' }}>
                        {card.change}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          
          {/* Left Column - Main Content */}
          <Grid item xs={12} lg={8}>
            
            {/* Upcoming Trips Card */}
            <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    🗓️ Upcoming Trips
                  </Typography>
                  <Button endIcon={<ChevronRight />} onClick={() => navigate('/tasks')}>
                    View All
                  </Button>
                </Box>

                {upcomingTrips.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Schedule sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No upcoming trips
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Book a guide to get started!
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {upcomingTrips.map((trip, index) => (
                      <React.Fragment key={trip.id}>
                        <ListItem
                          sx={{ py: 2, px: 0 }}
                          secondaryAction={
                            <Stack direction="row" spacing={1} alignItems="center">
                              {String(trip.status || '').toLowerCase() === 'pending' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit />}
                                  onClick={() => openTripEditDialog(trip)}
                                >
                                  Edit
                                </Button>
                              )}
                              {isPaymentRequired(trip) ? (
                                <FlutterwaveCheckoutButton
                                  size="small"
                                  payload={{
                                    user_id: user?.id,
                                    amount: Number(trip.price || 0),
                                    currency: user?.preferred_currency || 'UGX',
                                    email: user?.email,
                                    full_name: user?.name,
                                    payment_type: 'task_payment',
                                    task_id: trip.id
                                  }}
                                  label="Pay"
                                  onSuccess={() => {
                                    setActionStatus({
                                      severity: 'info',
                                      message: 'Flutterwave checkout opened. Finish payment to activate your trip.'
                                    });
                                  }}
                                  onError={(message) => {
                                    setActionStatus({ severity: 'error', message });
                                  }}
                                />
                              ) : canCompleteTrip(trip) ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleCompleteTrip(trip)}
                                >
                                  Mark Completed
                                </Button>
                              ) : (
                                <IconButton>
                                  <Message />
                                </IconButton>
                              )}
                            </Stack>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar src={trip.Walker?.profile_image || trip.walker?.profilePicture}>
                            {(trip.Walker?.name || trip.walker?.name || 'G')?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight="bold">
                              {trip.title || trip.description || 'Guide Request'}
                            </Typography>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 14 }} />
                                <Typography variant="caption">
                                  {formatDate(trip.scheduled_time || trip.scheduledTime, 'short')}
                                </Typography>
                              </Box>
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTime sx={{ fontSize: 14 }} />
                                <Typography variant="caption">
                                  {trip.estimated_duration || trip.duration || 30} min
                                </Typography>
                              </Box>
                              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <AttachMoney sx={{ fontSize: 14 }} />
                                <Typography variant="caption" fontWeight="bold">
                                  {formatCurrency(trip.price)}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                color={isTransportFacilitationRequired(trip) || isPaymentRequired(trip) ? 'warning' : 'success'}
                                label={
                                  isTransportFacilitationRequired(trip)
                                    ? `Motorbike support required${trip.transport_eta_minutes ? ` • ${trip.transport_eta_minutes} min ETA` : ''}`
                                    : isPaymentRequired(trip)
                                    ? (trip.is_approved ? 'Active • payment required' : 'Payment required')
                                    : getGuidedMessage(trip.id)
                                    ? getGuidedMessage(trip.id)
                                    : `ETA: ${getGuidedEtaMinutes(trip.id) ?? '...'} min`
                                }
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < upcomingTrips.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

            {/* Trips Awaiting Payment */}
            {pendingPayments.length > 0 && (
              <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #fff3cd' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                    <AttachMoney sx={{ color: '#f28c28' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#f28c28' }}>
                      💳 Pending Payments
                    </Typography>
                  </Box>
                  <Stack spacing={2}>
                    {pendingPayments.map((trip) => (
                      <Box key={`pay-${trip.id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{trip.description || 'Guide trip'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isTransportFacilitationRequired(trip)
                              ? `${formatCurrency(trip.transport_fee || trip.price || 0)} • Motorbike support`
                              : `${formatCurrency(trip.price)} • Admin approved`}
                          </Typography>
                          {isTransportFacilitationRequired(trip) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Nearest guide is {trip.transport_distance_km || '1+'} km away. ETA about {trip.transport_eta_minutes || 'N/A'} min.
                            </Typography>
                          )}
                        </Box>
                        <FlutterwaveCheckoutButton
                          size="small"
                          payload={{
                            user_id: user?.id,
                            amount: Number(isTransportFacilitationRequired(trip) ? (trip.transport_fee || trip.price || 0) : (trip.price || 0)),
                            currency: user?.preferred_currency || 'UGX',
                            email: user?.email,
                            full_name: user?.name,
                            payment_type: isTransportFacilitationRequired(trip) ? 'transport_facilitation' : 'task_payment',
                            task_id: trip.id
                          }}
                          label={getPaymentButtonCopy(trip).label}
                          onSuccess={() => {
                            setActionStatus({
                              severity: 'info',
                              message: getPaymentButtonCopy(trip).message
                            });
                          }}
                          onError={(message) => setActionStatus({ severity: 'error', message })}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Rate Completed Trips */}
            {feedbackQueue.length > 0 && (
              <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #d4edda' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                    <Star sx={{ color: '#2fbf8f' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2fbf8f' }}>
                      ⭐ Rate Your Trips
                    </Typography>
                  </Box>
                  <Stack spacing={2}>
                    {feedbackQueue.map((trip) => (
                      <Box key={`fb-${trip.id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{trip.description || 'Completed trip'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Completed on {formatDate(trip.completed_at || trip.updatedAt || trip.createdAt, 'short')}
                          </Typography>
                        </Box>
                        <Button variant="outlined" size="small" onClick={() => openFeedbackDialog(trip)}>
                          Rate
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Completed Trips History */}
            <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <CheckCircle sx={{ color: '#0b6e99' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0b6e99' }}>
                    ✓ Completed Trips
                  </Typography>
                </Box>
                {completedTrips.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No completed trips yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {completedTrips.map((trip) => (
                      <Box key={`done-${trip.id}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, pb: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{trip.description || 'Completed trip'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(trip.completed_at || trip.updatedAt || trip.createdAt, 'short')} • {formatCurrency(trip.price)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color="success"
                          label={trip.walkee_rating ? `${trip.walkee_rating}⭐` : 'Completed'}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Guides & Actions */}
          <Grid item xs={12} lg={4}>
            
            {/* Nearby Guides Map */}
            <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 0, height: 300 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>📍 Nearby Guides</Typography>
                      <Button size="small" onClick={() => navigate('/guides?service=guides')}>Explore</Button>
                    </Stack>
                  </Box>
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <TaskMap
                      tasks={mapMarkers}
                      userLocation={currentLocation}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Certified Guides */}
            <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Star sx={{ color: '#f1c40f' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    ⭐ Certified Guides
                  </Typography>
                  <Button size="small" sx={{ ml: 'auto' }} onClick={() => navigate('/guides?service=guides')}>View All</Button>
                </Box>
                {certifiedGuides.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No certified guides available now.
                  </Typography>
                ) : (
                  <List sx={{ p: 0 }}>
                    {certifiedGuides.map((guide, index) => (
                      <React.Fragment key={guide.id}>
                        <ListItem sx={{ py: 1.5, px: 0 }}>
                          <ListItemAvatar>
                            <Avatar src={guide.profile_image} sx={{ width: 40, height: 40 }}>
                              {guide.name?.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {guide.name}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <Star sx={{ fontSize: 12, color: 'gold' }} />
                                <Typography variant="caption">Certified</Typography>
                              </Box>
                            }
                          />
                          <Button
                            size="small"
                            sx={{ textTransform: 'none' }}
                            onClick={() => navigate(`/guides/${guide.id}`)}
                          >
                            View
                          </Button>
                        </ListItem>
                        {index < certifiedGuides.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Recent Guides */}
            <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <AccessTime sx={{ color: '#7c5ef1' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    👥 Recent Guides
                  </Typography>
                </Box>
                <List sx={{ p: 0 }}>
                  {recentGuides.map((guide, index) => (
                    <React.Fragment key={guide.id}>
                      <ListItem sx={{ py: 1.5, px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#7c5ef1', width: 40, height: 40 }}>
                            {guide.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {guide.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Star sx={{ fontSize: 12, color: 'gold' }} />
                              <Typography variant="caption">{guide.rating}</Typography>
                              <Typography variant="caption" color="text.secondary">• {guide.lastTrip}</Typography>
                            </Box>
                          }
                        />
                        <Button
                          size="small"
                          sx={{ textTransform: 'none' }}
                          onClick={() => guide?.id
                            ? navigate(`/guides/${guide.id}`)
                            : navigate('/guides?service=guides')}
                        >
                          View
                        </Button>
                      </ListItem>
                      {index < recentGuides.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>⚡ Quick Actions</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<CalendarToday />}
                      sx={{ py: 1.5, textTransform: 'none' }}
                      onClick={() => navigate('/schedule')}
                    >
                      Schedule
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Public />}
                      sx={{ py: 1.5, textTransform: 'none' }}
                      onClick={() => navigate('/profile')}
                    >
                      Profile
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Notifications />}
                      sx={{ py: 1.5, textTransform: 'none' }}
                      onClick={() => navigate('/notifications')}
                    >
                      Alerts
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Message />}
                      sx={{ py: 1.5, textTransform: 'none' }}
                      onClick={() => navigate('/messages')}
                    >
                      Messages
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Traveler Profiles Section */}
        <Box sx={{ mt: 4 }}>
          <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, pb: 2, borderBottom: '1px solid #eee' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  👥 Your Travel Companions
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {[
                  { name: 'Sophie', type: 'France', age: 29, trips: 12 },
                  { name: 'Jamal', type: 'USA', age: 34, trips: 8 },
                  { name: 'Akira', type: 'Japan', age: 27, trips: 15 }
                ].map((traveler, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined" sx={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50, fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {traveler.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {traveler.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {traveler.type} • {traveler.age} years
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Guided trips this month
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(traveler.trips / 20) * 100}
                            sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {traveler.trips} trips
                          </Typography>
                        </Box>

                        <Button size="small" fullWidth>
                          View Itinerary
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>

        {/* Feedback Dialog */}
        <Dialog
          open={feedbackDialog.open}
          onClose={() => {
            if (feedbackSubmitting) return;
            setFeedbackDialog({ open: false, task: null });
            setFeedbackError('');
          }}
          maxWidth="sm"
          fullWidth
        >
        <DialogTitle>Rate Your Trip</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {feedbackError && <Alert severity="error">{feedbackError}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Share your experience so admin can improve service quality.
            </Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Rating</Typography>
              <Rating
                value={feedbackForm.rating}
                onChange={(event, nextValue) =>
                  setFeedbackForm((prev) => ({ ...prev, rating: nextValue ?? prev.rating ?? 1 }))
                }
              />
            </Box>
            <TextField
              label="Feedback"
              multiline
              minRows={3}
              value={feedbackForm.feedback}
              onChange={(event) => setFeedbackForm((prev) => ({ ...prev, feedback: event.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={feedbackForm.complaint}
                  onChange={(event) =>
                    setFeedbackForm((prev) => ({ ...prev, complaint: event.target.checked }))
                  }
                />
              }
              label="Mark this feedback as a complaint"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (feedbackSubmitting) return;
              setFeedbackDialog({ open: false, task: null });
              setFeedbackError('');
            }}
            disabled={feedbackSubmitting}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={submitFeedback} disabled={feedbackSubmitting}>
            {feedbackSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={tripEditDialog.open}
        onClose={() => {
          if (tripEditSubmitting) return;
          setTripEditDialog({ open: false, task: null });
          setTripEditError('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Upcoming Trip</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tripEditError && <Alert severity="error">{tripEditError}</Alert>}
            <Typography variant="body2" color="text.secondary">
              You can change the pending trip date and add or update notes before it is accepted.
            </Typography>
            <TextField
              label="Trip date"
              type="datetime-local"
              value={tripEditForm.scheduled_time}
              onChange={(event) => setTripEditForm((prev) => ({ ...prev, scheduled_time: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={tripEditForm.notes}
              onChange={(event) => setTripEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (tripEditSubmitting) return;
              setTripEditDialog({ open: false, task: null });
              setTripEditError('');
            }}
            disabled={tripEditSubmitting}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={submitTripEdit} disabled={tripEditSubmitting}>
            {tripEditSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </>
  );
};

export default WalkeeDashboard;
