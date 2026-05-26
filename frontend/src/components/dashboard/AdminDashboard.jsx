import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  List,
  Divider,
  Snackbar
} from '@mui/material';
import {
  People,
  DirectionsWalk,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  MoreVert,
  Search,
  FilterList,
  CheckCircle,
  Cancel,
  Pending,
  Warning,
  Refresh,
  Download,
  PersonAdd,
  Edit,
  Delete,
  Block,
  VerifiedUser,
  Add,
  CloudUpload
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { taskAPI, userAPI, paymentAPI, adminAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import DashboardHeader from '../common/DashboardHeader';

const AdminDashboard = () => {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeWalkers: 0,
    pendingTasks: 0,
    totalRevenue: 0,
    travelerPaymentsCount: 0,
    totalDeposits: 0,
    totalPayouts: 0,
    totalBalance: 0,
    growthRate: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState(null);
  const [paymentsStatus, setPaymentsStatus] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({ page: 1, pages: 1, limit: 10 });
  const [payoutsPagination, setPayoutsPagination] = useState({ page: 1, pages: 1, limit: 10 });
  const [transactionsPagination, setTransactionsPagination] = useState({ page: 1, pages: 1, limit: 10 });
  const [withdrawalsFilters, setWithdrawalsFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [payoutsFilters, setPayoutsFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [transactionsFilters, setTransactionsFilters] = useState({
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: ''
  });
  const [payGuideOpen, setPayGuideOpen] = useState(false);
  const [payGuideForm, setPayGuideForm] = useState({
    user_id: '',
    amount: '',
    transfer_type: 'mobile_money',
    note: '',
    bank_code: '',
    destination_branch_code: '',
    account_number: '',
    country: 'UG',
    currency: 'UGX'
  });
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [guideOptions, setGuideOptions] = useState([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role_name: 'Walkee'
  });
  const [userFilters, setUserFilters] = useState({
    status: 'all',
    query: ''
  });
  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    search: ''
  });
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsContent, setLogsContent] = useState('');
  const [logs, setLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [moderationItems, setModerationItems] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target_role: 'all',
    expires_at: ''
  });
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [toastStatus, setToastStatus] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchDashboardData({ silent: true });
    const handleComplaint = (payload = {}) => {
      setToastStatus({
        severity: 'warning',
        message: payload.message || `Complaint submitted for trip ${payload.taskId || ''}`.trim()
      });
      fetchDashboardData({ silent: true });
    };
    socket.on('task_update', handleUpdate);
    socket.on('task_updated', handleUpdate);
    socket.on('new_task', handleUpdate);
    socket.on('new_message', handleUpdate);
    socket.on('system_notification', handleUpdate);
    socket.on('payment_received', handleUpdate);
    socket.on('complaint_submitted', handleComplaint);

    return () => {
      socket.off('task_update', handleUpdate);
      socket.off('task_updated', handleUpdate);
      socket.off('new_task', handleUpdate);
      socket.off('new_message', handleUpdate);
      socket.off('system_notification', handleUpdate);
      socket.off('payment_received', handleUpdate);
      socket.off('complaint_submitted', handleComplaint);
    };
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 4) {
      fetchPaymentsData();
    } else if (activeTab === 5) {
      fetchLogs();
    } else if (activeTab === 6) {
      fetchAnnouncements();
    }
  }, [
    activeTab,
    withdrawalsFilters,
    payoutsFilters,
    transactionsFilters,
    withdrawalsPagination.page,
    payoutsPagination.page,
    transactionsPagination.page,
    withdrawalsPagination.limit,
    payoutsPagination.limit,
    transactionsPagination.limit
  ]);

  useEffect(() => {
    if (!payGuideOpen) return;
    const fetchBanks = async () => {
      try {
        setBanksLoading(true);
        const response = await paymentAPI.listFlutterwaveBanks(payGuideForm.country || 'UG');
        setBanks(response.data?.banks || []);
      } catch (error) {
        console.error('Error fetching banks:', error);
      } finally {
        setBanksLoading(false);
      }
    };
    fetchBanks();
  }, [payGuideOpen, payGuideForm.country]);

  useEffect(() => {
    if (!payGuideOpen) return;
    fetchGuideOptions();
  }, [payGuideOpen]);

  const getRoleName = (user) => String(
    user?.Role?.name || user?.role?.name || user?.role_name || user?.role || ''
  ).toLowerCase();

  const isGuideCandidate = (user) => {
    const roleName = getRoleName(user);
    const roleId = Number(user?.role_id || user?.roleId || user?.Role?.id || user?.role?.id || 0);
    const isGuideRole = roleName === 'walker' || roleName === 'guide' || roleName === 'driver' || roleId === 2;
    const isCertifiedGuide = Boolean(user?.is_certified);
    const isActive = user?.is_active !== false;
    return (isGuideRole || isCertifiedGuide) && isActive;
  };

  const normalizeGuideOption = (user) => ({
    id: user.id,
    name: user.name || user.email || `Guide ${user.id}`,
    preferred_currency: String(user?.preferred_currency || '').toUpperCase()
  });

  const fetchGuideOptions = async () => {
    try {
      const allUsersResponse = await userAPI.getAll({ limit: 500, page: 1 });
      const allUsers = allUsersResponse.data?.users || allUsersResponse.data || [];
      const guides = allUsers
        .filter((user) => isGuideCandidate(user))
        .map(normalizeGuideOption);

      const uniqueGuides = Array.from(
        new Map(guides.map((guide) => [String(guide.id), guide])).values()
      );

      setGuideOptions(uniqueGuides);
    } catch (error) {
      console.error('Error fetching guide options:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await adminAPI.getLogs();
      setLogs(response.data?.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setActionStatus({ severity: 'error', message: 'Failed to fetch logs' });
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await adminAPI.getAnnouncements();
      setAnnouncements(response.data?.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setActionStatus({ severity: 'error', message: 'Failed to fetch announcements' });
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) {
      setActionStatus({ severity: 'error', message: 'Title and message are required.' });
      return;
    }

    try {
      setAnnouncementSubmitting(true);
      await adminAPI.createAnnouncement(announcementForm);
      setActionStatus({ severity: 'success', message: 'Announcement created successfully' });
      setAnnouncementOpen(false);
      setAnnouncementForm({
        title: '',
        message: '',
        type: 'info',
        target_role: 'all',
        expires_at: ''
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      setActionStatus({ severity: 'error', message: 'Failed to create announcement' });
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setActionStatus(null);
      }
      const [usersResult, tasksResult, transactionsResult] = await Promise.allSettled([
        userAPI.getAll(),
        taskAPI.getAll(),
        paymentAPI.listAdminTransactions({
          status: 'completed',
          page: 1,
          limit: 500
        })
      ]);

      const rawUsers = usersResult.status === 'fulfilled'
        ? (usersResult.value.data?.users || usersResult.value.data || [])
        : [];

      const rawTasks = tasksResult.status === 'fulfilled'
        ? (tasksResult.value.data?.tasks || tasksResult.value.data || [])
        : [];

      const completedTransactions = transactionsResult.status === 'fulfilled'
        ? (transactionsResult.value.data?.transactions || [])
        : [];

      const normalizedUsers = rawUsers.map((user) => {
        const roleName = user.Role?.name || user.role?.name || user.role_name || user.role || 'Traveler';
        return {
          id: user.id,
          name: user.name || user.username || 'User',
          email: user.email || 'unknown',
          role: roleName.toLowerCase(),
          status: user.is_active === false ? 'blocked' : 'active',
          joined: user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : 'N/A',
          is_certified: Boolean(user.is_certified),
          raw: user
        };
      });

      const normalizedTasks = rawTasks.map((task) => ({
        id: task.id,
        user: task.Walkee?.name || task.walkee?.name || 'Traveler',
        walker: task.Walker?.name || task.walker?.name || 'Guide',
        price: task.price || 0,
        status: task.status || 'pending',
        approved: Boolean(task.is_approved)
          || (Array.isArray(task.session_logs)
            ? task.session_logs.some((entry) => entry?.action === 'admin_approved')
            : false),
        date: (task.createdAt || task.scheduled_time)
          ? new Date(task.createdAt || task.scheduled_time).toISOString().slice(0, 10)
          : 'N/A',
        createdAt: task.createdAt || task.scheduled_time || null,
        raw: task
      }));

      normalizedTasks.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const extractedModerationItems = rawTasks.flatMap((task) => {
        const logs = Array.isArray(task.session_logs) ? task.session_logs : [];
        return logs
          .filter((entry) => entry?.action === 'feedback_submitted')
          .map((entry) => ({
            taskId: task.id,
            traveler: task.Walkee?.name || task.walkee?.name || 'Traveler',
            guide: task.Walker?.name || task.walker?.name || 'Guide',
            rating: entry.rating || task.walkee_rating || null,
            feedback: entry.feedback || '',
            complaint: Boolean(entry.complaint),
            createdAt: entry.timestamp || task.updatedAt || task.createdAt
          }));
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const activeWalkers = normalizedUsers.filter((user) =>
        user.role === 'walker' && user.status === 'active'
      ).length;

      const pendingTasks = normalizedTasks.filter((task) =>
        task.status === 'pending' && !task.approved
      ).length;

      const travelerPaidTransactions = completedTransactions.filter((txn) =>
        ['task_payment', 'transport_facilitation'].includes(String(txn.payment_type || '').toLowerCase())
      );

      const totalRevenue = travelerPaidTransactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
      const depositTransactions = completedTransactions.filter((txn) =>
        ['top_up', 'task_payment', 'transport_facilitation'].includes(String(txn.payment_type || '').toLowerCase())
      );
      const payoutTransactions = completedTransactions.filter((txn) =>
        ['commission', 'withdrawal', 'refund'].includes(String(txn.payment_type || '').toLowerCase())
      );
      const totalDeposits = depositTransactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
      const totalPayouts = payoutTransactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
      const totalBalance = totalDeposits - totalPayouts;

      setStats({
        totalUsers: normalizedUsers.length,
        activeWalkers,
        pendingTasks,
        totalRevenue,
        travelerPaymentsCount: travelerPaidTransactions.length,
        totalDeposits,
        totalPayouts,
        totalBalance,
        growthRate: 0
      });

      setUsers(normalizedUsers);
      setRecentUsers(normalizedUsers.slice(0, 5));
      setRecentTasks(normalizedTasks);
      setModerationItems(extractedModerationItems);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (!silent) {
        setActionStatus({ severity: 'error', message: 'Unable to refresh admin data.' });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchPaymentsData = async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsStatus(null);

      const withdrawalQuery = {
        status: withdrawalsFilters.status !== 'all' ? withdrawalsFilters.status : undefined,
        start_date: withdrawalsFilters.startDate || undefined,
        end_date: withdrawalsFilters.endDate || undefined
      };

      const payoutQuery = {
        status: payoutsFilters.status !== 'all' ? payoutsFilters.status : undefined,
        start_date: payoutsFilters.startDate || undefined,
        end_date: payoutsFilters.endDate || undefined
      };

      const transactionQuery = {
        status: transactionsFilters.status !== 'all' ? transactionsFilters.status : undefined,
        type: transactionsFilters.type !== 'all' ? transactionsFilters.type : undefined,
        start_date: transactionsFilters.startDate || undefined,
        end_date: transactionsFilters.endDate || undefined
      };

      const [withdrawalsResult, payoutsResult, transactionsResult, usersResult] = await Promise.allSettled([
        paymentAPI.listWithdrawals({
          status: withdrawalQuery.status,
          start_date: withdrawalQuery.start_date,
          end_date: withdrawalQuery.end_date,
          page: withdrawalsPagination.page,
          limit: withdrawalsPagination.limit
        }),
        paymentAPI.listAdminPayouts({
          status: payoutQuery.status,
          start_date: payoutQuery.start_date,
          end_date: payoutQuery.end_date,
          page: payoutsPagination.page,
          limit: payoutsPagination.limit
        }),
        paymentAPI.listAdminTransactions({
          status: transactionQuery.status,
          type: transactionQuery.type,
          start_date: transactionQuery.start_date,
          end_date: transactionQuery.end_date,
          page: transactionsPagination.page,
          limit: transactionsPagination.limit
        }),
        userAPI.getAll({ role: 'Walker', limit: 500, page: 1 })
      ]);

      const withdrawalData = withdrawalsResult.status === 'fulfilled'
        ? (withdrawalsResult.value.data?.withdrawals || [])
        : [];

      setWithdrawals(withdrawalData);
      setWithdrawalsPagination((prev) => ({
        ...prev,
        pages: withdrawalsResult.status === 'fulfilled'
          ? (withdrawalsResult.value.data?.pagination?.pages || 1)
          : 1
      }));

      const payoutData = payoutsResult.status === 'fulfilled'
        ? (payoutsResult.value.data?.payouts || [])
        : [];

      setPayouts(payoutData);
      setPayoutsPagination((prev) => ({
        ...prev,
        pages: payoutsResult.status === 'fulfilled'
          ? (payoutsResult.value.data?.pagination?.pages || 1)
          : 1
      }));

      const transactionData = transactionsResult.status === 'fulfilled'
        ? (transactionsResult.value.data?.transactions || [])
        : [];

      setTransactions(transactionData);
      setTransactionsPagination((prev) => ({
        ...prev,
        pages: transactionsResult.status === 'fulfilled'
          ? (transactionsResult.value.data?.pagination?.pages || 1)
          : 1
      }));

      const rawUsers = usersResult.status === 'fulfilled'
        ? (usersResult.value.data?.users || usersResult.value.data || [])
        : [];

      const guides = rawUsers
        .filter((user) => isGuideCandidate(user))
        .map(normalizeGuideOption);

      setGuideOptions(guides);
    } catch (error) {
      setPaymentsStatus({ severity: 'error', message: 'Unable to load payment requests.' });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleWithdrawalsFilterChange = (key, value) => {
    setWithdrawalsFilters((prev) => ({ ...prev, [key]: value }));
    setWithdrawalsPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePayoutsFilterChange = (key, value) => {
    setPayoutsFilters((prev) => ({ ...prev, [key]: value }));
    setPayoutsPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTransactionsFilterChange = (key, value) => {
    setTransactionsFilters((prev) => ({ ...prev, [key]: value }));
    setTransactionsPagination((prev) => ({ ...prev, page: 1 }));
  };

  const pagedWithdrawals = withdrawals;
  const pagedPayouts = payouts;
  const pagedTransactions = transactions;

  const statsCards = [
    {
      title: 'Total Travelers',
      value: stats.totalUsers,
      icon: <People />,
      color: '#4A90E2',
      change: '+24 this week',
      trend: 'up'
    },
    {
      title: 'Active Guides',
      value: stats.activeWalkers,
      icon: <DirectionsWalk />,
      color: '#2ECC71',
      change: '+8 this month',
      trend: 'up'
    },
    {
      title: 'Pending Verifications',
      value: stats.pendingTasks,
      icon: <Pending />,
      color: '#F39C12',
      change: '-5 today',
      trend: 'down'
    },
    {
      title: 'Total Balance',
      value: `UGX ${Number(stats.totalBalance || 0).toLocaleString()}`,
      icon: <AttachMoney />,
      color: '#9B59B6',
      change: `Deposits: UGX ${Number(stats.totalDeposits || 0).toLocaleString()} | Payouts: UGX ${Number(stats.totalPayouts || 0).toLocaleString()}`,
      trend: 'up'
    }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 4000, trips: 120 },
    { month: 'Feb', revenue: 3000, trips: 98 },
    { month: 'Mar', revenue: 5000, trips: 150 },
    { month: 'Apr', revenue: 4500, trips: 135 },
    { month: 'May', revenue: 6000, trips: 180 },
    { month: 'Jun', revenue: 5500, trips: 165 }
  ];

  const userDistribution = [
    { name: 'Guides', value: 35 },
    { name: 'Travelers', value: 65 }
  ];

  const COLORS = ['#4A90E2', '#2ECC71', '#F39C12', '#9B59B6'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'blocked': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'pending': return <Pending />;
      case 'blocked': return <Block />;
      default: return null;
    }
  };

  const getRoleDisplayName = (role) => {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole === 'walker') return 'Guide';
    if (normalizedRole === 'walkee') return 'Traveler';
    if (normalizedRole === 'admin') return 'Admin';
    return role;
  };

  const parseAuditLogDetails = (details) => {
    if (!details) return null;
    if (typeof details === 'object') return details;
    try {
      return JSON.parse(details);
    } catch (error) {
      return null;
    }
  };

  const getLogActor = (log) => {
    const parsed = parseAuditLogDetails(log.details);
    return parsed?.user_name || parsed?.user_email || log.User?.name || log.user_id || 'System';
  };

  const handleAddUserSubmit = async () => {
    try {
      await userAPI.create(newUser);
      setAddUserOpen(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role_name: 'Walkee' });
      setActionStatus({ severity: 'success', message: 'User created successfully.' });
      fetchDashboardData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to create user.'
      });
    }
  };

  const handleUpdateUserRole = async (user) => {
    const roleName = window.prompt('Enter new role (Admin, Guide, Traveler):', user.role);
    if (!roleName) return;
    try {
      await userAPI.update(user.id, { role_name: roleName });
      setActionStatus({ severity: 'success', message: 'User updated.' });
      fetchDashboardData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to update user.'
      });
    }
  };

  const handleDeactivateUser = async (user) => {
    const confirm = window.confirm(`Deactivate ${user.name}?`);
    if (!confirm) return;
    try {
      await userAPI.delete(user.id);
      setActionStatus({ severity: 'success', message: 'User deactivated.' });
      fetchDashboardData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to deactivate user.'
      });
    }
  };

  const handleMarkWithdrawalPaid = async (payment) => {
    const confirm = window.confirm(`Send withdrawal ${payment.id} using Flutterwave now?`);
    if (!confirm) return;

    const account_bank = window.prompt('Enter guide bank code (Flutterwave bank code):');
    if (!account_bank) return;

    const account_number = window.prompt('Enter guide account number:');
    if (!account_number) return;

    try {
      await paymentAPI.markWithdrawalPaid(payment.id, {
        note: 'Paid via Flutterwave by admin',
        provider: 'flutterwave',
        account_bank,
        account_number,
        currency: payment.currency || 'UGX',
        narration: 'Guide withdrawal payout'
      });
      setPaymentsStatus({ severity: 'success', message: 'Withdrawal sent via Flutterwave.' });
      fetchPaymentsData();
    } catch (error) {
      setPaymentsStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to send withdrawal via Flutterwave.'
      });
    }
  };

  const handleVerifyPendingTaskPayment = async (payment) => {
    if (!payment?.id) return;
    const confirm = window.confirm(`Verify pending task payment ${payment.id}?`);
    if (!confirm) return;

    try {
      await paymentAPI.verifyAdminTaskPayment(payment.id, {
        note: 'Verified by admin for guide assignment'
      });
      setPaymentsStatus({
        severity: 'success',
        message: 'Pending payment verified. Guides can now take the task.'
      });
      fetchPaymentsData();
      fetchDashboardData({ silent: true });
    } catch (error) {
      setPaymentsStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to verify pending payment.'
      });
    }
  };

  const extractThreeDigitBankCode = (value) => {
    const match = String(value || '').match(/\b(\d{3})\b/);
    return match ? match[1] : '';
  };

  const resolvePayGuideRequest = () => {
    const country = 'UG';
    const transferType = String(payGuideForm.transfer_type || 'mobile_money').toLowerCase();
    const accountNumber = String(payGuideForm.account_number || '').replace(/[+\s]/g, '');
    const note = String(payGuideForm.note || '').trim();
    const resolvedCurrency = 'UGX';
    const debitCurrency = 'UGX';
    const bankSelection = String(payGuideForm.bank_code || '').trim();
    const extractedBankCode = extractThreeDigitBankCode(bankSelection);
    const accountBank = transferType === 'mobile_money'
      ? 'MPS'
      : (extractedBankCode || bankSelection);
    const destinationBranchCode = transferType === 'bank'
      ? String(payGuideForm.destination_branch_code || '').trim() || extractedBankCode
      : '';

    return {
      country,
      transferType,
      accountNumber,
      note,
      resolvedCurrency,
      debitCurrency,
      accountBank,
      destinationBranchCode
    };
  };

  const isPayGuideFormValid = () => {
    const { transferType, accountNumber, accountBank, destinationBranchCode } = resolvePayGuideRequest();

    if (!payGuideForm.user_id || !payGuideForm.amount) return false;
    if (!accountNumber) return false;

    if (transferType === 'mobile_money') {
      if (!/^256\d{8,9}$/.test(accountNumber)) return false;
      if (!accountBank) return false;
    }

    if (transferType === 'bank') {
      if (!accountBank) return false;
      if (!destinationBranchCode) return false;
    }

    return true;
  };

  const handlePayGuide = async () => {
    const {
      country,
      transferType,
      accountNumber,
      note,
      resolvedCurrency,
      debitCurrency,
      accountBank,
      destinationBranchCode
    } = resolvePayGuideRequest();

    if (!payGuideForm.user_id || !payGuideForm.amount) {
      setPaymentsStatus({ severity: 'error', message: 'Select a guide and amount.' });
      return;
    }

    if (!accountNumber) {
      setPaymentsStatus({ severity: 'error', message: 'Enter an account number.' });
      return;
    }

    if (transferType === 'mobile_money' && !/^256\d{8,9}$/.test(accountNumber)) {
      setPaymentsStatus({ severity: 'error', message: 'Uganda mobile money numbers must start with 256.' });
      return;
    }

    if (transferType === 'bank' && !accountBank) {
      setPaymentsStatus({ severity: 'error', message: 'Select a bank code for bank transfers.' });
      return;
    }

    if (transferType === 'bank' && !destinationBranchCode) {
      setPaymentsStatus({ severity: 'error', message: 'Destination branch code is required for Uganda bank transfers.' });
      return;
    }

    try {
      const payload = {
        user_id: payGuideForm.user_id,
        amount: Number(payGuideForm.amount),
        country,
        transfer_type: transferType,
        currency: resolvedCurrency,
        account_bank: accountBank,
        account_number: accountNumber,
        debit_currency: debitCurrency,
        narration: note || 'Guide payout via Flutterwave'
      };

      if (transferType === 'bank') {
        payload.destination_branch_code = destinationBranchCode;
      } else {
        delete payload.destination_branch_code;
      }

      await paymentAPI.createFlutterwaveTransfer(payload);

      setPaymentsStatus({ severity: 'success', message: 'Payment issued to guide.' });
      setPayGuideOpen(false);
      setPayGuideForm({
        user_id: '',
        amount: '',
        transfer_type: 'mobile_money',
        note: '',
        bank_code: '',
        destination_branch_code: '',
        account_number: '',
        country: 'UG',
        currency: 'UGX'
      });
      fetchPaymentsData();
    } catch (error) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.detail
        || error.response?.data?.error
        || error.message
        || 'Unable to issue payment.';

      window.alert(errorMessage);
      setPaymentsStatus({
        severity: 'error',
        message: errorMessage
      });
    }
  };

  const handleRefundTraveler = async (payment) => {
    const account_bank = window.prompt('Enter traveler bank code for refund (Flutterwave bank code):');
    if (!account_bank) return;

    const account_number = window.prompt('Enter traveler account number:');
    if (!account_number) return;

    const amountInput = window.prompt('Refund amount:', String(payment.amount || ''));
    const amount = Number(amountInput);
    if (!amount || amount <= 0) {
      setPaymentsStatus({ severity: 'error', message: 'Invalid refund amount.' });
      return;
    }

    try {
      await paymentAPI.adminRefundTraveler(payment.id, {
        account_bank,
        account_number,
        amount,
        currency: payment.currency || 'UGX'
      });
      setPaymentsStatus({ severity: 'success', message: 'Traveler refund initiated successfully.' });
      fetchPaymentsData();
    } catch (error) {
      setPaymentsStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to initiate refund.'
      });
    }
  };

  const handleToggleCertification = async (user) => {
    const nextStatus = !user.is_certified;
    const confirm = window.confirm(
      `${nextStatus ? 'Certify' : 'Uncertify'} ${user.name}?`
    );
    if (!confirm) return;
    try {
      await userAPI.update(user.id, { is_certified: nextStatus });
      setActionStatus({ severity: 'success', message: 'Certification updated.' });
      fetchDashboardData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to update certification.'
      });
    }
  };

  const handleCancelTask = async (task) => {
    try {
      await taskAPI.cancel(task.id, 'Cancelled by admin');
      setActionStatus({ severity: 'success', message: 'Task cancelled.' });
      fetchDashboardData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to cancel task.'
      });
    }
  };

  const handleApproveTask = async (task) => {
    const confirm = window.confirm(`Approve trip ${task.id}? This makes the traveler payment step available.`);
    if (!confirm) return;

    try {
      await taskAPI.approve(task.id, 'Approved by admin for guide assignment');
      setRecentTasks((prev) => prev.map((item) => (
        String(item.id) === String(task.id)
          ? { ...item, approved: true, status: 'approved' }
          : item
      )));
      setActionStatus({ severity: 'success', message: 'Trip verified and forwarded to the traveler and nearby guides.' });
      fetchDashboardData();
      fetchPaymentsData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to approve trip.'
      });
    }
  };

  const handleRejectTask = async (task) => {
    const confirm = window.confirm(`Reject and cancel trip ${task.id}?`);
    if (!confirm) return;

    try {
      await taskAPI.cancel(task.id, 'Rejected by admin');
      setActionStatus({ severity: 'success', message: 'Trip rejected and cancelled successfully.' });
      fetchDashboardData();
      fetchPaymentsData();
    } catch (error) {
      setActionStatus({
        severity: 'error',
        message: error.response?.data?.message || 'Unable to reject trip.'
      });
    }
  };

  const handleExport = () => {
    const rows = [
      ['Type', 'Name', 'Email/Guide', 'Status/Price', 'Date'],
      ...recentUsers.map((user) => ['User', user.name, user.email, user.status, user.joined]),
      ...recentTasks.map((task) => ['Task', task.user, task.walker, task.status, task.date])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'admin-dashboard-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter((user) => {
    const matchesStatus = userFilters.status === 'all' || user.status === userFilters.status;
    const query = userFilters.query.trim().toLowerCase();
    const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const filteredTasks = recentTasks.filter((task) => {
    const effectiveStatus = task.approved && task.status === 'pending' ? 'approved' : task.status;
    if (taskFilters.status === 'all' && effectiveStatus === 'approved') {
      return false;
    }
    const matchesStatus = taskFilters.status === 'all'
      ? true
      : (taskFilters.status === 'pending'
        ? (task.status === 'pending' && !task.approved)
        : effectiveStatus === taskFilters.status);
    const query = taskFilters.search.trim().toLowerCase();
    const matchesQuery = !query || 
      task.user.toLowerCase().includes(query) || 
      task.walker.toLowerCase().includes(query) ||
      String(task.id).includes(query);
    return matchesStatus && matchesQuery;
  });

  const activeClaims = recentTasks.filter((task) => {
    const effectiveStatus = task.approved && task.status === 'pending' ? 'approved' : task.status;
    return ['approved', 'assigned', 'in_progress'].includes(effectiveStatus);
  });

  if (loading) {
    return (
      <>
        <DashboardHeader title="Admin Dashboard" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography>Loading admin dashboard...</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Admin Dashboard" />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 4
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System overview and management
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setAddUserOpen(true)}
          >
            Add User
          </Button>
        </Stack>
      </Box>

      {actionStatus && (
        <Alert severity={actionStatus.severity} sx={{ mb: 3 }}>
          {actionStatus.message}
        </Alert>
      )}

      <Snackbar
        open={Boolean(toastStatus)}
        autoHideDuration={6000}
        onClose={() => setToastStatus(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToastStatus(null)}
          severity={toastStatus?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toastStatus?.message}
        </Alert>
      </Snackbar>

      <Alert severity="info" sx={{ mb: 3 }}>
        Transaction records become real after completed assignments, guide payouts, and wallet withdrawals processed through the payment APIs.
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: card.color }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                  <Box sx={{
                    bgcolor: `${card.color}20`,
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {card.icon}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {card.trend === 'up' ? (
                    <TrendingUp sx={{ color: '#2ECC71', fontSize: 16, mr: 0.5 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#E74C3C', fontSize: 16, mr: 0.5 }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{ color: card.trend === 'up' ? '#2ECC71' : '#E74C3C' }}
                  >
                    {card.change}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue & Trips Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="trips"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Trips"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userDistribution}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    innerRadius={60}
                  >
                    {userDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} users`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Users" />
          <Tab label="Tasks" />
          <Tab label="Reports" />
          <Tab label="Settings" />
          <Tab label="Payments" />
          <Tab label="Logs" />
          <Tab label="Announcements" />
          <Tab label="Certificates" />
          <Tab label="Active Claims" />
        </Tabs>
      </Box>

      {/* Users Table */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 2,
                mb: 3
              }}
            >
              <Typography variant="h6">
                Users Management
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  size="small"
                  placeholder="Search users..."
                  value={userFilters.query}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, query: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
                <Select
                  size="small"
                  value={userFilters.status}
                  onChange={(e) => setUserFilters((prev) => ({ ...prev, status: e.target.value }))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </Stack>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Certification</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleDisplayName(user.role)}
                          size="small"
                          color={user.role === 'walker' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        {user.role === 'walker' ? (
                          <Chip
                            label={user.is_certified ? 'Certified' : 'Pending'}
                            size="small"
                            color={user.is_certified ? 'success' : 'default'}
                            icon={<VerifiedUser />}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status)}
                          size="small"
                          icon={getStatusIcon(user.status)}
                        />
                      </TableCell>
                      <TableCell>{user.joined}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleUpdateUserRole(user)}>
                          <Edit />
                        </IconButton>
                        {user.role === 'walker' && (
                          <IconButton size="small" onClick={() => handleToggleCertification(user)}>
                            <VerifiedUser />
                          </IconButton>
                        )}
                        <IconButton size="small" color="error" onClick={() => handleDeactivateUser(user)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Recent Tasks
              </Typography>

              <Stack direction="row" spacing={2}>
                 <TextField
                  size="small"
                  placeholder="Search tasks..."
                  value={taskFilters.search}
                  onChange={(e) => setTaskFilters((prev) => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
                <Select
                  size="small"
                  value={taskFilters.status}
                  onChange={(e) => setTaskFilters((prev) => ({ ...prev, status: e.target.value }))}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="assigned">Assigned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </Stack>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task ID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Guide</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} hover>
                      <TableCell>#{task.id}</TableCell>
                      <TableCell>{task.user}</TableCell>
                      <TableCell>{task.walker}</TableCell>
                      <TableCell>${task.price}</TableCell>
                      <TableCell>
                        {(() => {
                          const effectiveStatus = task.approved && task.status === 'pending' ? 'approved' : task.status;
                          const color =
                            effectiveStatus === 'completed' ? 'success' :
                            effectiveStatus === 'in_progress' ? 'primary' :
                            effectiveStatus === 'assigned' ? 'info' :
                            effectiveStatus === 'approved' ? 'success' :
                            effectiveStatus === 'pending' ? 'warning' : 'error';

                          return (
                            <Chip
                              label={effectiveStatus}
                              size="small"
                              color={color}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>{task.date}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleApproveTask(task)}
                          disabled={task.status === 'completed' || task.status === 'cancelled' || task.approved}
                          sx={{ mr: 1 }}
                        >
                          {task.approved ? 'Approved' : 'Approve & Activate'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRejectTask(task)}
                          disabled={task.status === 'completed' || task.status === 'cancelled' || task.approved}
                          sx={{ mr: 1 }}
                        >
                          Reject Trip
                        </Button>
                        <IconButton size="small" onClick={() => handleCancelTask(task)} aria-label="cancel trip" disabled={task.approved}>
                          <Cancel />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Traveler Feedback & Complaints</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Ratings are forwarded here after each completed trip. Complaints are highlighted for immediate admin review.
            </Typography>
            {moderationItems.length === 0 ? (
              <Alert severity="info">No feedback or complaints yet.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Trip</TableCell>
                      <TableCell>Traveler</TableCell>
                      <TableCell>Guide</TableCell>
                      <TableCell>Rating</TableCell>
                      <TableCell>Feedback</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {moderationItems.map((item, index) => (
                      <TableRow key={`${item.taskId}-${index}`} hover>
                        <TableCell>#{item.taskId}</TableCell>
                        <TableCell>{item.traveler}</TableCell>
                        <TableCell>{item.guide}</TableCell>
                        <TableCell>{item.rating ? `${item.rating}/5` : 'N/A'}</TableCell>
                        <TableCell>{item.feedback || 'No written feedback'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={item.complaint ? 'error' : 'success'}
                            label={item.complaint ? 'Complaint' : 'Feedback'}
                          />
                        </TableCell>
                        <TableCell>
                          {item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
             <Typography variant="h6" gutterBottom>System Settings</Typography>
             <Stack spacing={3}>
               <Box>
                 <Typography variant="subtitle1">Database Management</Typography>
                 <Typography variant="body2" color="text.secondary" paragraph>
                   Manage database backups and maintenance.
                 </Typography>
                 <Button 
                   variant="contained" 
                   startIcon={<CloudUpload />}
                   onClick={async () => {
                     try {
                       setBackupLoading(true);
                       const response = await adminAPI.backupDatabase();
                       const blob = new Blob([response.data], { type: 'application/json' });
                       const url = URL.createObjectURL(blob);
                       const link = document.createElement('a');
                       const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                       link.href = url;
                       link.setAttribute('download', `voya-backup-${timestamp}.json`);
                       document.body.appendChild(link);
                       link.click();
                       document.body.removeChild(link);
                       URL.revokeObjectURL(url);
                       setActionStatus({ severity: 'success', message: 'Database backup downloaded successfully.' });
                     } catch (error) {
                       setActionStatus({
                         severity: 'error',
                         message: error.response?.data?.message || 'Unable to create database backup.'
                       });
                     } finally {
                       setBackupLoading(false);
                     }
                   }}
                   disabled={backupLoading}
                 >
                   {backupLoading ? 'Backing up...' : 'Backup Database'}
                 </Button>
               </Box>
               <Divider />
               <Box>
                 <Typography variant="subtitle1">System Updates</Typography>
                 <Typography variant="body2" color="text.secondary" paragraph>
                   This area is reserved for release checks and deployment updates.
                 </Typography>
                 <Button
                   variant="outlined"
                   sx={{ mt: 1 }}
                   onClick={() => setActionStatus({
                     severity: 'info',
                     message: 'Release checks are informational only. Use the backend logs and deployment pipeline for live updates.'
                   })}
                 >
                   Check for Updates
                 </Button>
               </Box>
             </Stack>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Withdrawals</Typography>
              <Button variant="contained" onClick={() => setPayGuideOpen(true)}>
                Pay Guide
              </Button>
            </Box>

            {paymentsStatus && (
              <Alert severity={paymentsStatus.severity} sx={{ mb: 2 }}>
                {paymentsStatus.message}
              </Alert>
            )}

            {paymentsLoading ? (
              <Typography>Loading payments...</Typography>
            ) : (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Withdrawal requests
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
                    <TextField
                      select
                      label="Status"
                      value={withdrawalsFilters.status}
                      onChange={(event) => handleWithdrawalsFilterChange('status', event.target.value)}
                      size="small"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="processing">Processing</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </TextField>
                    <TextField
                      label="Start date"
                      type="date"
                      size="small"
                      value={withdrawalsFilters.startDate}
                      onChange={(event) => handleWithdrawalsFilterChange('startDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End date"
                      type="date"
                      size="small"
                      value={withdrawalsFilters.endDate}
                      onChange={(event) => handleWithdrawalsFilterChange('endDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setWithdrawalsFilters({
                          status: 'all',
                          startDate: '',
                          endDate: ''
                        })
                      }
                    >
                      Reset
                    </Button>
                  </Stack>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <TextField
                      select
                      size="small"
                      label="Rows"
                      value={withdrawalsPagination.limit}
                      onChange={(event) =>
                        setWithdrawalsPagination((prev) => ({
                          ...prev,
                          limit: Number(event.target.value),
                          page: 1
                        }))
                      }
                      sx={{ width: 120 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </TextField>
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Guide</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Requested</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedWithdrawals.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {payment.User?.name || payment.User?.email || 'Guide'}
                              </Typography>
                            </TableCell>
                            <TableCell>${payment.amount}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={payment.status === 'completed' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              {payment.createdAt
                                ? new Date(payment.createdAt).toISOString().slice(0, 10)
                                : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleMarkWithdrawalPaid(payment)}
                                disabled={payment.status === 'completed'}
                              >
                                Pay via Flutterwave
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedWithdrawals.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No withdrawal requests found for the selected filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Pagination
                      count={withdrawalsPagination.pages}
                      page={withdrawalsPagination.page}
                      onChange={(event, page) =>
                        setWithdrawalsPagination((prev) => ({ ...prev, page }))
                      }
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Guide payouts
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
                    <TextField
                      select
                      label="Status"
                      value={payoutsFilters.status}
                      onChange={(event) => handlePayoutsFilterChange('status', event.target.value)}
                      size="small"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="processing">Processing</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </TextField>
                    <TextField
                      label="Start date"
                      type="date"
                      size="small"
                      value={payoutsFilters.startDate}
                      onChange={(event) => handlePayoutsFilterChange('startDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End date"
                      type="date"
                      size="small"
                      value={payoutsFilters.endDate}
                      onChange={(event) => handlePayoutsFilterChange('endDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setPayoutsFilters({
                          status: 'all',
                          startDate: '',
                          endDate: ''
                        })
                      }
                    >
                      Reset
                    </Button>
                  </Stack>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <TextField
                      select
                      size="small"
                      label="Rows"
                      value={payoutsPagination.limit}
                      onChange={(event) =>
                        setPayoutsPagination((prev) => ({
                          ...prev,
                          limit: Number(event.target.value),
                          page: 1
                        }))
                      }
                      sx={{ width: 120 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </TextField>
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Guide</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Paid</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedPayouts.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {payment.User?.name || payment.User?.email || 'Guide'}
                              </Typography>
                            </TableCell>
                            <TableCell>${payment.amount}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={payment.status === 'completed' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              {payment.createdAt
                                ? new Date(payment.createdAt).toISOString().slice(0, 10)
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedPayouts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              No guide payouts found for the selected filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Pagination
                      count={payoutsPagination.pages}
                      page={payoutsPagination.page}
                      onChange={(event, page) =>
                        setPayoutsPagination((prev) => ({ ...prev, page }))
                      }
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Wallet transactions
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
                    <TextField
                      select
                      label="Status"
                      value={transactionsFilters.status}
                      onChange={(event) => handleTransactionsFilterChange('status', event.target.value)}
                      size="small"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="processing">Processing</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                      <MenuItem value="refunded">Refunded</MenuItem>
                    </TextField>
                    <TextField
                      select
                      label="Type"
                      value={transactionsFilters.type}
                      onChange={(event) => handleTransactionsFilterChange('type', event.target.value)}
                      size="small"
                    >
                      <MenuItem value="all">All types</MenuItem>
                      <MenuItem value="task_payment">Task payments</MenuItem>
                      <MenuItem value="withdrawal">Withdrawals</MenuItem>
                      <MenuItem value="top_up">Top ups</MenuItem>
                      <MenuItem value="refund">Refunds</MenuItem>
                      <MenuItem value="commission">Commissions</MenuItem>
                    </TextField>
                    <TextField
                      label="Start date"
                      type="date"
                      size="small"
                      value={transactionsFilters.startDate}
                      onChange={(event) => handleTransactionsFilterChange('startDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End date"
                      type="date"
                      size="small"
                      value={transactionsFilters.endDate}
                      onChange={(event) => handleTransactionsFilterChange('endDate', event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setTransactionsFilters({
                          status: 'all',
                          type: 'all',
                          startDate: '',
                          endDate: ''
                        })
                      }
                    >
                      Reset
                    </Button>
                  </Stack>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <TextField
                      select
                      size="small"
                      label="Rows"
                      value={transactionsPagination.limit}
                      onChange={(event) =>
                        setTransactionsPagination((prev) => ({
                          ...prev,
                          limit: Number(event.target.value),
                          page: 1
                        }))
                      }
                      sx={{ width: 120 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </TextField>
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedTransactions.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {payment.User?.name || payment.User?.email || 'User'}
                              </Typography>
                            </TableCell>
                            <TableCell>{payment.payment_type}</TableCell>
                            <TableCell>${payment.amount}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={payment.status === 'completed' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              {payment.createdAt
                                ? new Date(payment.createdAt).toISOString().slice(0, 10)
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {payment.payment_type === 'task_payment' && ['pending', 'processing'].includes(payment.status) ? (
                                <Button size="small" variant="outlined" onClick={() => handleVerifyPendingTaskPayment(payment)}>
                                  Verify payment
                                </Button>
                              ) : payment.payment_type === 'task_payment' && payment.status === 'completed' ? (
                                <Button size="small" variant="outlined" onClick={() => handleRefundTraveler(payment)}>
                                  Refund traveler
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedTransactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No wallet transactions found for the selected filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Pagination
                      count={transactionsPagination.pages}
                      page={transactionsPagination.page}
                      onChange={(event, page) =>
                        setTransactionsPagination((prev) => ({ ...prev, page }))
                      }
                    />
                  </Box>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs Tab */}
      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Audit Logs</Typography>
              <Button startIcon={<Refresh />} onClick={fetchLogs}>
                Refresh
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{getLogActor(log)}</TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.severity}
                          color={log.severity === 'error' ? 'error' : log.severity === 'warning' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No logs found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 6 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Announcements</Typography>
              <Button startIcon={<Add />} onClick={() => setAnnouncementOpen(true)}>
                New Announcement
              </Button>
            </Box>
            <List>
              {announcements.map((announcement) => (
                <Card key={announcement.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {announcement.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      To: {announcement.target_role} • Type: {announcement.type} • {new Date(announcement.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body1">
                      {announcement.message}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {announcements.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center">
                  No announcements found.
                </Typography>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 7 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Guide Certifications</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.filter((user) => user.role === 'walker').map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_certified ? 'Certified' : 'Pending'}
                          size="small"
                          color={user.is_certified ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleToggleCertification(user)}
                        >
                          {user.is_certified ? 'Uncertify' : 'Certify'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.filter((user) => user.role === 'walker').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No guides found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 8 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Active Claims Monitor</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tracks tasks that are activated by admin, assigned to guides, or currently in progress.
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task ID</TableCell>
                    <TableCell>Traveler</TableCell>
                    <TableCell>Guide</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeClaims.map((task) => {
                    const effectiveStatus = task.approved && task.status === 'pending' ? 'verified' : task.status;
                    const statusLabel =
                      effectiveStatus === 'verified' ? 'Verified' :
                      effectiveStatus === 'assigned' ? 'Claimed' :
                      effectiveStatus === 'in_progress' ? 'In Progress' :
                      'Active';
                    const statusColor =
                      effectiveStatus === 'verified'
                        ? 'success'
                        : effectiveStatus === 'assigned'
                        ? 'info'
                        : effectiveStatus === 'in_progress'
                        ? 'primary'
                        : 'default';
                    return (
                      <TableRow key={`claim-${task.id}`}>
                        <TableCell>#{task.id}</TableCell>
                        <TableCell>{task.user}</TableCell>
                        <TableCell>{task.walker}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={statusLabel}
                            color={statusColor}
                          />
                        </TableCell>
                        <TableCell>${task.price}</TableCell>
                        <TableCell>{task.date}</TableCell>
                      </TableRow>
                    );
                  })}
                  {activeClaims.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No active claims right now.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={addUserOpen} onClose={() => setAddUserOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={newUser.name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={newUser.phone}
              onChange={(event) => setNewUser((prev) => ({ ...prev, phone: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={newUser.role_name}
                onChange={(event) => setNewUser((prev) => ({ ...prev, role_name: event.target.value }))}
              >
                <MenuItem value="Walkee">Traveler</MenuItem>
                <MenuItem value="Walker">Guide</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUserSubmit}>Create</Button>
        </DialogActions>
      </Dialog>
          <Button variant="contained" onClick={handlePayGuide} disabled={!isPayGuideFormValid() || paymentsLoading}>
            Pay Guide
          </Button>
      <Dialog open={payGuideOpen} onClose={() => setPayGuideOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pay Guide</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Guide"
              value={payGuideForm.user_id}
              onChange={(event) => {
                const nextGuideId = event.target.value;
                const selectedGuide = guideOptions.find((guide) => String(guide.id) === String(nextGuideId));
                const currencyToCountry = {
                  UGX: 'UG',
                  KES: 'KE',
                  NGN: 'NG'
                };
                const inferredCurrency = selectedGuide?.preferred_currency;
                const inferredCountry = currencyToCountry[inferredCurrency] || payGuideForm.country;
                const fallbackCurrency = inferredCountry === 'KE' ? 'KES' : inferredCountry === 'NG' ? 'NGN' : 'UGX';

                setPayGuideForm((prev) => ({
                  ...prev,
                  user_id: nextGuideId,
                  country: inferredCountry,
                  currency: inferredCurrency || fallbackCurrency,
                  bank_code: '',
                  destination_branch_code: ''
                }));
              }}
              fullWidth
            >
              {guideOptions.map((guide) => (
                <MenuItem key={guide.id} value={guide.id}>
                  {guide.name}
                </MenuItem>
              ))}
              {guideOptions.length === 0 && (
                <MenuItem disabled value="">
                  No guides found
                </MenuItem>
              )}
            </TextField>
            <TextField
              label="Amount"
              type="number"
              value={payGuideForm.amount}
              onChange={(event) =>
                setPayGuideForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              fullWidth
            />
            <TextField
              select
              label="Transfer type"
              value={payGuideForm.transfer_type}
              onChange={(event) =>
                setPayGuideForm((prev) => ({ ...prev, transfer_type: event.target.value, bank_code: '', destination_branch_code: '' }))
              }
              fullWidth
            >
              <MenuItem value="mobile_money">Mobile money</MenuItem>
              <MenuItem value="bank">Bank transfer</MenuItem>
            </TextField>
            <TextField
              select
              label="Country"
              value={payGuideForm.country}
              onChange={(event) => {
                const nextCountry = event.target.value;
                const defaultCurrency =
                  nextCountry === 'US' ? 'USD'
                  : nextCountry === 'GB' ? 'GBP'
                  : nextCountry === 'EU' ? 'EUR'
                  : nextCountry === 'KE' ? 'KES'
                  : nextCountry === 'NG' ? 'NGN'
                  : nextCountry === 'TZ' ? 'TZS'
                  : nextCountry === 'RW' ? 'RWF'
                  : 'UGX';

                setPayGuideForm((prev) => ({
                  ...prev,
                  country: nextCountry,
                  currency: defaultCurrency,
                  bank_code: '',
                  destination_branch_code: ''
                }));
              }}
              fullWidth
            >
              <MenuItem value="UG">Uganda</MenuItem>
              <MenuItem value="KE">Kenya</MenuItem>
              <MenuItem value="NG">Nigeria</MenuItem>
              <MenuItem value="TZ">Tanzania</MenuItem>
              <MenuItem value="RW">Rwanda</MenuItem>
              <MenuItem value="US">United States</MenuItem>
              <MenuItem value="GB">United Kingdom</MenuItem>
              <MenuItem value="EU">Eurozone</MenuItem>
            </TextField>
            {payGuideForm.transfer_type === 'bank' && (
              <>
                <TextField
                  select
                  label="Flutterwave bank code"
                  value={payGuideForm.bank_code}
                  onChange={(event) =>
                    setPayGuideForm((prev) => ({ ...prev, bank_code: event.target.value }))
                  }
                  fullWidth
                  helperText={banksLoading ? 'Loading banks...' : 'Use Flutterwave bank code for the selected country'}
                >
                  {banks.map((bank) => (
                    <MenuItem key={bank.id || bank.code} value={bank.code}>
                      {bank.name}
                    </MenuItem>
                  ))}
                </TextField>
                {payGuideForm.country === 'UG' && (
                  <TextField
                    label="Destination branch code"
                    value={payGuideForm.destination_branch_code}
                    onChange={(event) =>
                      setPayGuideForm((prev) => ({ ...prev, destination_branch_code: event.target.value }))
                    }
                    fullWidth
                    helperText="Required for Uganda bank transfers"
                  />
                )}
                <TextField
                  label="Flutterwave account number"
                  value={payGuideForm.account_number}
                  onChange={(event) =>
                    setPayGuideForm((prev) => ({ ...prev, account_number: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Currency"
                  value={payGuideForm.currency}
                  onChange={(event) =>
                    setPayGuideForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  fullWidth
                />
              </>
            )}
            {payGuideForm.transfer_type === 'mobile_money' && (
              <>
                <TextField
                  label="Account bank"
                  value={payGuideForm.country === 'KE' ? 'MPESA' : payGuideForm.country === 'UG' ? 'MPS' : payGuideForm.bank_code}
                  fullWidth
                  disabled
                  helperText="Auto-selected from the country and transfer type"
                />
                <TextField
                  label="Mobile money account number"
                  value={payGuideForm.account_number}
                  onChange={(event) =>
                    setPayGuideForm((prev) => ({ ...prev, account_number: event.target.value }))
                  }
                  fullWidth
                  helperText={payGuideForm.country === 'UG'
                    ? 'Uganda mobile money numbers must start with 256'
                    : payGuideForm.country === 'KE'
                      ? 'Kenya MPESA numbers must start with 254'
                      : 'Enter the recipient mobile money number'}
                />
                <TextField
                  label="Currency"
                  value={payGuideForm.currency}
                  onChange={(event) =>
                    setPayGuideForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  fullWidth
                />
              </>
            )}
            <TextField
              label="Note"
              value={payGuideForm.note}
              onChange={(event) =>
                setPayGuideForm((prev) => ({ ...prev, note: event.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayGuideOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePayGuide}>
            Pay Guide
          </Button>
        </DialogActions>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={announcementOpen} onClose={() => setAnnouncementOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send Announcement</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={announcementForm.type}
              label="Type"
              onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})}
            >
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Target Role</InputLabel>
            <Select
              value={announcementForm.target_role}
              label="Target Role"
              onChange={(e) => setAnnouncementForm({...announcementForm, target_role: e.target.value})}
            >
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="walker">Guides Only</MenuItem>
              <MenuItem value="walkee">Travelers Only</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Message"
            multiline
            minRows={3}
            value={announcementForm.message}
            onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateAnnouncement}
            disabled={announcementSubmitting}
          >
            {announcementSubmitting ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onClose={() => setLogsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Server Logs</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline minRows={12} value={logsContent} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* System Status */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>

              <Box sx={{ '& > *': { mb: 2 } }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Server Uptime</Typography>
                    <Typography variant="body2" fontWeight="bold">99.8%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={99.8} color="success" />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Database</Typography>
                    <Typography variant="body2" fontWeight="bold">Healthy</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={100} color="success" />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">API Response Time</Typography>
                    <Typography variant="body2" fontWeight="bold">120ms</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={95} color="success" />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Active Connections</Typography>
                    <Typography variant="body2" fontWeight="bold">248</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={65} color="info" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setAnnouncementOpen(true)}>
                    Send Announcement
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setActiveTab(4)}>
                    Open Payments
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setActiveTab(0)}>
                    Manage Users
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setActiveTab(1)}>
                    Manage Tasks
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setActiveTab(7)}>
                    Certificates
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth sx={{ py: 1.5 }} onClick={() => setActiveTab(5)}>
                    View Logs
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
    </>
  );
};

export default AdminDashboard;
