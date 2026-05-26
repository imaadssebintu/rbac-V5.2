import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  AvatarGroup,
  Avatar,
  Box,
  LinearProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  LocationOn,
  AccessTime,
  AttachMoney,
  CheckCircle,
  DirectionsWalk
} from '@mui/icons-material';
import { taskAPI, paymentAPI, payoutAPI, adminAPI } from '../../services/api';
import TaskMap from '../tasks/TaskMap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import DashboardHeader from '../common/DashboardHeader';
import locationTrackingService from '../../services/locationTrackingService';
import { calculateDistance } from '../../utils/helpers';

const WalkerDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    earnings: 0,
    rating: 4.8
  });
  const [actionStatus, setActionStatus] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [coinWalletBalance, setCoinWalletBalance] = useState(0);
  const [coinTransactions, setCoinTransactions] = useState([]);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    bankName: '',
    accountNumber: ''
  });
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [nearbyGuides, setNearbyGuides] = useState([]);
  const [acceptingTaskId, setAcceptingTaskId] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    fetchTasks();
    fetchStats();
    fetchWalletBalance();
    fetchCoinWalletBalance();
    fetchCoinWalletHistory();
    fetchWalletHistory();
    fetchAnnouncements();
  }, [user?.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => null
    );
  }, []);

  useEffect(() => {
    if (!currentLocation || typeof taskAPI.nearBy !== 'function') return;

    const fetchNearbyGuides = async () => {
      try {
        const response = await taskAPI.nearBy(currentLocation.lat, currentLocation.lng, 5000);
        const walkers = response.data?.walkers || [];
        setNearbyGuides(
          walkers.map((walker) => ({
            id: `guide-${walker.id}`,
            title: walker.name || 'Nearby guide',
            markerType: 'walker',
            latitude:
              walker.location?.latitude
              ?? walker.location?.lat
              ?? walker.location?.coordinates?.[1],
            longitude:
              walker.location?.longitude
              ?? walker.location?.lng
              ?? walker.location?.coordinates?.[0],
            description: walker.is_certified ? 'Certified guide nearby' : 'Guide nearby'
          }))
        );
      } catch (error) {
        console.error('Error fetching nearby guides:', error);
      }
    };

    fetchNearbyGuides();
  }, [currentLocation]);

  const getTaskDistanceKm = (task) => {
    const pickupLocation = task?.pickup_location || task?.location || null;
    const pickupLat = Number(pickupLocation?.lat ?? pickupLocation?.latitude);
    const pickupLng = Number(pickupLocation?.lng ?? pickupLocation?.longitude);

    if (!currentLocation || !Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
      return Number(task?.distance || task?.transport_distance_km || 0) || null;
    }

    return calculateDistance(currentLocation.lat, currentLocation.lng, pickupLat, pickupLng, 'km');
  };

  const getTaskEtaMinutes = (task) => {
    const presetEta = Number(task?.transport_eta_minutes);
    if (Number.isFinite(presetEta) && presetEta > 0) {
      return Math.round(presetEta);
    }

    const distanceKm = getTaskDistanceKm(task);
    if (!Number.isFinite(Number(distanceKm))) return null;
    return Math.max(1, Math.round((Number(distanceKm) / 30) * 60));
  };

  const mapMarkers = [
    currentLocation
      ? {
          id: 'guide-current-location',
          title: 'You',
          description: 'Your live guide location',
          markerType: 'guide',
          pointKind: 'guide_self',
          latitude: currentLocation.lat,
          longitude: currentLocation.lng
        }
      : null,
    ...nearbyGuides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      markerType: 'walker',
      pointKind: 'guide',
      latitude: guide.latitude,
      longitude: guide.longitude
    })),
    ...tasks.flatMap((task) => {
      const markers = [];
      const pickupLocation = task?.pickup_location || task?.location || null;
      const pickupLat = Number(pickupLocation?.lat ?? pickupLocation?.latitude);
      const pickupLng = Number(pickupLocation?.lng ?? pickupLocation?.longitude);

      if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
        const distanceKm = getTaskDistanceKm(task);
        markers.push({
          id: `pickup-${task.id}`,
          taskRef: task.id,
          title: task.title || task.description || 'Traveler pickup',
          travelerName: task.Walkee?.name || task.walkee?.name || 'Traveler',
          guideName: user?.name || 'Guide',
          phone: task.Walkee?.phone || task.walkee?.phone || null,
          description: task.transport_facilitation_required
            ? `Traveler pickup point • Motorbike support${task.transport_fee ? ` • $${task.transport_fee}` : ''}`
            : 'Traveler pickup point',
          markerType: task.transport_facilitation_required ? 'motorcycle' : 'traveler',
          pointKind: 'pickup',
          latitude: pickupLat,
          longitude: pickupLng,
          distanceKm,
          paidAmount: String(task.payment_status || '').toLowerCase() === 'completed' ? Number(task.price || 0) : 0,
          destinationAddress: task.destination?.address || task.destination_location || null,
          scheduledTime: task.scheduled_time
            ? new Date(task.scheduled_time).toLocaleString()
            : 'Not scheduled',
          weather: task.weather || null,
          transportFee: task.transport_fee || null,
          etaRemainingMinutes: getTaskEtaMinutes(task)
        });
      }

      if (task.destination && Number.isFinite(Number(task.destination.lat)) && Number.isFinite(Number(task.destination.lng))) {
        markers.push({
          id: `destination-${task.id}`,
          taskRef: task.id,
          title: 'Destination',
          travelerName: task.Walkee?.name || task.walkee?.name || 'Traveler',
          guideName: user?.name || 'Guide',
          phone: task.Walkee?.phone || task.walkee?.phone || null,
          description: task.destination.address || 'Trip destination',
          markerType: 'destination',
          pointKind: 'destination',
          latitude: Number(task.destination.lat),
          longitude: Number(task.destination.lng),
          paidAmount: String(task.payment_status || '').toLowerCase() === 'completed' ? Number(task.price || 0) : 0,
          destinationAddress: task.destination.address || task.destination_location || null,
          scheduledTime: task.scheduled_time
            ? new Date(task.scheduled_time).toLocaleString()
            : 'Not scheduled',
          weather: task.weather || null
        });
      }

      return markers;
    })
  ].filter(Boolean);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchTasks();
    const handleSystemNotification = () => {
      fetchTasks();
      fetchAnnouncements();
    };
    socket.on('task_update', handleUpdate);
    socket.on('task_updated', handleUpdate);
    socket.on('new_task', handleUpdate);
    socket.on('system_notification', handleSystemNotification);
    socket.on('payment_received', handleUpdate);

    return () => {
      socket.off('task_update', handleUpdate);
      socket.off('task_updated', handleUpdate);
      socket.off('new_task', handleUpdate);
      socket.off('system_notification', handleSystemNotification);
      socket.off('payment_received', handleUpdate);
    };
  }, [socket]);

  // Cleanup location tracking when component unmounts or task completes
  useEffect(() => {
    return () => {
      locationTrackingService.stopTracking();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleAcceptTask = async (task) => {
    setActionStatus(null);
    
    // Prevent double-click
    if (acceptingTaskId === task.id) {
      return;
    }

    if (!currentLocation) {
      setActionStatus({ severity: 'warning', message: 'Enable location to start an assignment.' });
      return;
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      setActionStatus({ severity: 'info', message: 'This assignment cannot be started.' });
      return;
    }

    if (task.status === 'in_progress') {
      setActionStatus({ severity: 'info', message: 'This assignment is already in progress.' });
      return;
    }

    if (task.walker_id && task.walker_id !== user?.id && task.status === 'assigned') {
      setActionStatus({ severity: 'error', message: 'This assignment has already been claimed by another guide.' });
      return;
    }

    if (!task.is_approved) {
      setActionStatus({ severity: 'warning', message: 'This trip is still awaiting admin approval.' });
      return;
    }

    try {
      setAcceptingTaskId(task.id);

      let taskIdToStart = task.id;
      
      // Only assign if not yet assigned to this guide
      if (!task.walker_id && user?.id) {
        const assignResponse = await taskAPI.assign(task.id, user.id);
        taskIdToStart = assignResponse.data?.task?.id || task.id;
      }

      if (task.requires_payment) {
        setActionStatus({
          severity: 'info',
          message: 'Task claimed successfully. Waiting for traveler payment before you can start.'
        });
        setTimeout(() => {
          fetchTasks();
        }, 500);
        return;
      }

      // Start the task
      await taskAPI.start(taskIdToStart, currentLocation);
      
      // Start location tracking for this task
      locationTrackingService.startTracking(taskIdToStart);
      
      setActionStatus({ severity: 'success', message: 'Assignment activated successfully. Guide is en route.' });
      
      // Refresh tasks after a short delay to ensure backend has updated
      setTimeout(() => {
        fetchTasks();
      }, 500);
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to activate assignment.'
      });
      console.error('Error accepting task:', error);
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const fetchTasks = async () => {
    try {
      let data = [];

      if (typeof taskAPI.getUserTasks === 'function' && user?.id) {
        const scopedResponse = await taskAPI.getUserTasks(user.id, 'Walker');
        data = scopedResponse.data?.tasks || scopedResponse.data || [];
      }

      if (!Array.isArray(data) || data.length === 0) {
        const fallbackResponse = await taskAPI.getAll();
        data = fallbackResponse.data?.tasks || fallbackResponse.data || [];
      }

      let actionable = data.filter((task) => {
        const status = String(task?.status || '').toLowerCase();
        const taskWalkerId = task?.walker_id || task?.walkerId || task?.Walker?.id || null;
        const isAssignedToMe = taskWalkerId && String(taskWalkerId) === String(user?.id);
        const isUnassignedNearby = !taskWalkerId && ['pending', 'approved'].includes(status);

        if (['completed', 'cancelled'].includes(status)) return false;

        if (isAssignedToMe) {
          return ['assigned', 'in_progress', 'approved', 'pending'].includes(status);
        }

        if (isUnassignedNearby) {
          return true;
        }

        return false;
      });

      // If the scoped API returns stale/irrelevant rows, fall back to global feed so active nearby travelers are visible.
      if (actionable.length === 0) {
        const fallbackResponse = await taskAPI.getAll();
        const fallbackData = fallbackResponse.data?.tasks || fallbackResponse.data || [];
        actionable = fallbackData.filter((task) => {
          const status = String(task?.status || '').toLowerCase();
          const taskWalkerId = task?.walker_id || task?.walkerId || task?.Walker?.id || null;
          return !taskWalkerId && ['pending', 'approved'].includes(status);
        });
      }

      setTasks(actionable.slice(0, 6));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await adminAPI.getUserAnnouncements();
      setAnnouncements(response.data?.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchStats = async () => {
    // Fetch walker statistics
    // Mock data for now
    setStats({
      completed: 24,
      pending: 3,
      earnings: 1250.50,
      rating: 4.8
    });
  };

  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const response = await paymentAPI.getBalance(user.id);
      setWalletBalance(Number(response.data?.balance || 0));
      setAvailableBalance(Number(response.data?.available_balance ?? response.data?.balance ?? 0));
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
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

  const handleWithdrawalSubmit = async () => {
    setWithdrawalStatus(null);

    const amount = Number(withdrawalForm.amount);
    if (!amount || amount <= 0) {
      setWithdrawalStatus({ severity: 'error', message: 'Enter a valid amount.' });
      return;
    }

    if (!withdrawalForm.bankName.trim() || !withdrawalForm.accountNumber.trim()) {
      setWithdrawalStatus({ severity: 'error', message: 'Enter the bank name and account number.' });
      return;
    }

    try {
      setWithdrawalSubmitting(true);
      await payoutAPI.requestWithdrawal({
        amount,
        bankName: withdrawalForm.bankName.trim(),
        accountNumber: withdrawalForm.accountNumber.trim(),
        paymentMethod: withdrawalForm.payment_method,
        currency: user?.preferred_currency || 'UGX',
        accountName: user?.name || ''
      });
      setWithdrawalStatus({ severity: 'success', message: 'Withdrawal request submitted successfully.' });
      setWithdrawalForm({
        amount: '',
        payment_method: 'bank_transfer',
        bankName: '',
        accountNumber: ''
      });
      setWithdrawalDialogOpen(false);
      await fetchWalletBalance();
      await fetchWalletHistory();
    } catch (error) {
      setWithdrawalStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to submit withdrawal.'
      });
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const completedEarnings = walletTransactions.reduce((sum, payment) => {
    const amount = Number(payment?.amount || 0);
    const type = String(payment?.payment_type || '').toLowerCase();
    if (payment?.status === 'completed' && ['task_payment', 'top_up', 'refund'].includes(type)) {
      return sum + amount;
    }
    return sum;
  }, 0);

  const completedWithdrawals = payoutHistory.reduce((sum, payment) => {
    const amount = Number(payment?.amount || 0);
    if (payment?.status === 'completed' && String(payment?.payment_type || '').toLowerCase() === 'withdrawal') {
      return sum + amount;
    }
    return sum;
  }, 0);

  const totalProcessed = completedEarnings + completedWithdrawals;
  const walletAvailable = Number.isFinite(Number(availableBalance)) ? Number(availableBalance) : Number(walletBalance || 0);

  return (
    <>
      <DashboardHeader title="Guide Dashboard" />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Assignments
              </Typography>
              <Typography variant="h3">
                {stats.completed + stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Earnings
              </Typography>
              <Typography variant="h3">
                ${stats.earnings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rating
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h3" sx={{ mr: 1 }}>
                  {stats.rating}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  /5.0
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.rating * 20}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Reviews
              </Typography>
              <Typography variant="h3" color="primary.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active assignments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mb: 3 }}>
        Complete an assignment to create earnings, then use Flutterwave to withdraw guide earnings to your bank or mobile money account.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payout history
              </Typography>
              {transactionsLoading ? (
                <Typography color="text.secondary">Loading payouts...</Typography>
              ) : payoutHistory.length === 0 ? (
                <Typography color="text.secondary">No payouts yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {payoutHistory.map((payment) => (
                    <Box
                      key={payment.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          {payment.payment_type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payment.createdAt
                            ? new Date(payment.createdAt).toISOString().slice(0, 10)
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${payment.status}`}
                        size="small"
                        color={payment.status === 'completed' ? 'success' : 'warning'}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Wallet transactions
              </Typography>
              {transactionsLoading ? (
                <Typography color="text.secondary">Loading transactions...</Typography>
              ) : walletTransactions.length === 0 ? (
                <Typography color="text.secondary">No transactions yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {walletTransactions.map((payment) => (
                    <Box
                      key={payment.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          {payment.payment_type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payment.createdAt
                            ? new Date(payment.createdAt).toISOString().slice(0, 10)
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        ${payment.amount}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Wallet balance
              </Typography>
              <Typography variant="h3" color="primary.main">
                ${walletAvailable.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available for withdrawal
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total earned</Typography>
                  <Typography variant="body1">${completedEarnings.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total withdrawn</Typography>
                  <Typography variant="body1">${completedWithdrawals.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Wallet processed</Typography>
                  <Typography variant="body1">${totalProcessed.toFixed(2)}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Coin wallet
              </Typography>
              <Typography variant="h3" color="primary.main">
                {coinWalletBalance.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Coins for discounts and rewards
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Separate from payout wallet</Typography>
                  <Typography variant="body1">Used for traveler discount redemption and reward accumulation</Typography>
                </Box>
                {coinTransactions.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Recent coin activity
                    </Typography>
                    <Stack spacing={1}>
                      {coinTransactions.slice(0, 3).map((entry) => (
                        <Box key={entry.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2">{entry.type}</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {Number(entry.amount) > 0 ? `+${entry.amount}` : entry.amount}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Withdraw earnings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use Flutterwave to send wallet funds to your bank or mobile money account.
                  </Typography>
                </Box>
                <Button variant="contained" onClick={() => setWithdrawalDialogOpen(true)}>
                  Withdraw with Flutterwave
                </Button>
                {withdrawalStatus && (
                  <Alert severity={withdrawalStatus.severity}>
                    {withdrawalStatus.message}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={withdrawalDialogOpen} onClose={() => setWithdrawalDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Flutterwave Withdrawal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={withdrawalForm.amount}
              onChange={(event) =>
                setWithdrawalForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Payout method"
              select
              value={withdrawalForm.payment_method}
              onChange={(event) =>
                setWithdrawalForm((prev) => ({ ...prev, payment_method: event.target.value }))
              }
              fullWidth
            >
              <MenuItem value="mobile_money">Mobile money</MenuItem>
              <MenuItem value="bank_transfer">Bank transfer</MenuItem>
            </TextField>
            <TextField
              label="Bank name"
              placeholder="Enter the bank or mobile money provider name"
              value={withdrawalForm.bankName}
              onChange={(event) =>
                setWithdrawalForm((prev) => ({ ...prev, bankName: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Account number"
              value={withdrawalForm.accountNumber}
              onChange={(event) =>
                setWithdrawalForm((prev) => ({ ...prev, accountNumber: event.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawalDialogOpen(false)} disabled={withdrawalSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleWithdrawalSubmit} variant="contained" disabled={withdrawalSubmitting}>
            {withdrawalSubmitting ? 'Sending...' : 'Withdraw'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map and Tasks Side by Side */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: { xs: 280, md: 500 } }}>
            <CardContent sx={{ height: '100%', p: { xs: 2, md: 3 } }}>
              <TaskMap tasks={mapMarkers} userLocation={currentLocation} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Tabs value={activeRightTab} onChange={(_, next) => setActiveRightTab(next)}>
              <Tab label="Nearby Travelers" />
              <Tab label="Announcements" />
            </Tabs>
            {actionStatus && (
              <Alert severity={actionStatus.severity}>{actionStatus.message}</Alert>
            )}
          </Stack>

          {activeRightTab === 0 && tasks.map((task) => (
            <Card key={task.id} sx={{ mb: 2, cursor: 'pointer' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {task.title}
                  </Typography>
                  <Chip
                    label={`$${task.price}`}
                    color="primary"
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {task.description}
                </Typography>

                {(task.transport_facilitation_required || task.transport_eta_minutes) && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {task.transport_facilitation_required
                      ? `Transport facilitated by traveler. ETA to traveler: ${task.transport_eta_minutes || 'N/A'} min.`
                      : `ETA to traveler: ${task.transport_eta_minutes || 'N/A'} min.`}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Traveler: {task.Walkee?.name || task.walkee?.name || 'Traveler'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">
                      {getTaskDistanceKm(task) != null ? `${getTaskDistanceKm(task).toFixed(1)} km away` : 'Distance unavailable'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">
                      {getTaskEtaMinutes(task) ?? 'N/A'} min away
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AvatarGroup max={3}>
                    <Avatar alt="Traveler" />
                    <Avatar alt="Guide" />
                  </AvatarGroup>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleAcceptTask(task)}
                    disabled={
                      acceptingTaskId === task.id ||
                      task.status === 'completed' ||
                      task.status === 'cancelled' ||
                      task.status === 'in_progress' ||
                      (task.walker_id && task.walker_id !== user?.id)
                    }
                  >
                    {acceptingTaskId === task.id
                      ? 'Activating...'
                      : task.status === 'in_progress'
                      ? 'Active'
                      : task.status === 'completed'
                      ? 'Completed'
                      : task.status === 'cancelled'
                      ? 'Cancelled'
                      : task.walker_id && task.walker_id !== user?.id
                      ? 'Claimed'
                      : task.status === 'pending'
                      ? 'Assign & Activate'
                      : 'Activate Assignment'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}

          {activeRightTab === 0 && tasks.length === 0 && (
            <Alert severity="info">
              No nearby traveler assignments yet. Keep location enabled and check again in a moment.
            </Alert>
          )}

          {activeRightTab === 1 && (
            <Card>
              <CardContent>
                {announcements.length === 0 ? (
                  <Alert severity="info">No announcements available right now.</Alert>
                ) : (
                  <List disablePadding>
                    {announcements.map((item, index) => (
                      <React.Fragment key={item.id || `${item.title}-${index}`}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemText
                            primary={item.title || 'Announcement'}
                            secondary={`${item.message || ''}${item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString()}` : ''}`}
                          />
                        </ListItem>
                        {index < announcements.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      </Box>
    </>
  );
};

export default WalkerDashboard;
