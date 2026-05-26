import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  LocationOn,
  AccessTime,
  AttachMoney,
  Pets,
  Star,
  MoreVert,
  CheckCircle,
  Pending
} from '@mui/icons-material';
import TaskList from '../components/tasks/TaskList';
import TaskMap from '../components/tasks/TaskMap';
import { taskAPI } from '../services/api';

const Tasks = () => {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price_asc', 'price_desc', 'distance'
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    price: '',
    duration: 30,
    pickupAddress: '',
    destinationAddress: ''
  });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState(null);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let response;
      if (normalizedRole === 'walker') {
        // Guides see all available tasks
        response = await taskAPI.getAll(); 
      } else {
        // Travelers see their own tasks
        response = await taskAPI.getUserTasks(user?.id, 'Walkee');
      }
      const data = response.data?.tasks || response.data || [];
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetQuote = async () => {
    const pickupAddress = String(newTask.pickupAddress || '').trim();
    const destinationAddress = String(newTask.destinationAddress || '').trim();

    if (!pickupAddress || !destinationAddress) {
      alert('Please enter both pickup and destination locations.');
      return;
    }

    try {
      setQuoteLoading(true);
      const pickup = {
        address: pickupAddress,
        lat: currentLocation?.lat,
        lng: currentLocation?.lng
      };

      const destination = {
        address: destinationAddress
      };

      const response = await taskAPI.quote({ pickup_location: pickup, destination });
      const quote = response.data?.quote;
      setQuoteInfo(quote || null);
      if (quote?.fare_estimate) {
        setNewTask((prev) => ({ ...prev, price: quote.fare_estimate }));
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      alert(error.response?.data?.message || 'Unable to calculate quote right now.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleCreateTask = async () => {
    const pickupAddress = String(newTask.pickupAddress || '').trim();
    const destinationAddress = String(newTask.destinationAddress || '').trim();

    if (!pickupAddress || !destinationAddress) {
      alert('Please enter both pickup and destination locations before requesting a guide.');
      return;
    }

    if (createTaskLoading) {
      return; // Prevent double submission
    }

    try {
      setCreateTaskLoading(true);
      const pickup = { 
        address: pickupAddress,
        lat: currentLocation?.lat,
        lng: currentLocation?.lng
      }; 
      const destination = { 
        address: destinationAddress
      };
      
      const taskResponse = await taskAPI.create({
        walkee_id: user?.id,
        description: newTask.title ? `${newTask.title}\n${newTask.description}` : newTask.description,
        price: parseFloat(newTask.price) || 0,
        pickup_location: pickup,
        destination: destination,
        scheduled_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending'
      });

      const createdTask = taskResponse.data?.task;
      if (!createdTask?.id) {
        throw new Error('Task created but task id is missing');
      }

      setOpenCreateDialog(false);
      setNewTask({ title: '', description: '', price: '', duration: 30, pickupAddress: '', destinationAddress: '' });
      setQuoteInfo(null);
      setCreateTaskLoading(false);
      
      // Don't call fetchTasks here - let socket event handle it
      alert('Trip request submitted. Once admin approves it, you will pay using Flutterwave from your dashboard.');
    } catch (error) {
      setCreateTaskLoading(false);
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + (error.response?.data?.message || error.message));
    }
  };

  const getDistance = (task) => {
    if (!currentLocation || !task.pickup_location) return Infinity;
    const lat1 = currentLocation.lat;
    const lon1 = currentLocation.lng;
    const lat2 = task.pickup_location.lat;
    const lon2 = task.pickup_location.lng;
    
    // Simple Euclidean distance for sorting (not accurate for real distance but enough for "nearest")
    // For real distance use Haversine
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  };

  const filteredTasks = tasks.filter(task => {
    // Tab filtering
    if (activeTab === 1 && task.status !== 'pending') return false;
    if (activeTab === 2 && (task.status !== 'accepted' && task.status !== 'assigned' && task.status !== 'in_progress')) return false;
    if (activeTab === 3 && task.status !== 'completed') return false;

    // Search filtering
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      return (
        task.title?.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
      );
    }
    
    return true;
  }).sort((a, b) => {
     if (sortBy === 'price_asc') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
     if (sortBy === 'price_desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
     if (sortBy === 'newest') return new Date(b.createdAt || b.scheduled_time) - new Date(a.createdAt || a.scheduled_time);
     if (sortBy === 'distance') return getDistance(a) - getDistance(b);
     return 0;
  });

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setFilterAnchor(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {normalizedRole === 'walker' ? 'Available Guide Requests' : 'My Guide Requests'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2 }}
          onClick={() => {
            if (normalizedRole === 'walker') {
              setActiveTab(0);
            } else {
              setOpenCreateDialog(true);
            }
          }}
        >
          {normalizedRole === 'walker' ? 'Find Trips' : 'Request Guide'}
        </Button>
      </Box>

      {/* Search & Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={(e) => setFilterAnchor(e.currentTarget)}
                >
                  Filters: {sortBy.replace('_', ' ')}
                </Button>
                <Button 
                  variant={activeTab === 4 ? "contained" : "outlined"}
                  onClick={() => setActiveTab(4)}
                >
                  Map View
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem onClick={() => handleSortChange('newest')}>Date: Newest</MenuItem>
        <MenuItem onClick={() => handleSortChange('price_asc')}>Price: Low to High</MenuItem>
        <MenuItem onClick={() => handleSortChange('price_desc')}>Price: High to Low</MenuItem>
        <MenuItem onClick={() => handleSortChange('distance')}>Distance: Nearest</MenuItem>
      </Menu>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="All" />
          <Tab label="Pending" />
          <Tab label="Active" />
          <Tab label="Completed" />
          <Tab label="Map View" />
        </Tabs>
      </Box>

      {/* Content */}
      <Grid container spacing={3}>
        {activeTab === 4 ? (
          // Map View
          <Grid item xs={12}>
            <Card sx={{ height: { xs: 360, md: 500 }, maxHeight: 520 }}>
              <CardContent sx={{ height: '100%' }}>
                <TaskMap tasks={filteredTasks} userLocation={currentLocation} />
              </CardContent>
            </Card>
          </Grid>
        ) : (
          // List View
          <>
            <Grid item xs={12} md={8}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TaskList tasks={filteredTasks} />
              )}
            </Grid>

            {/* Stats Sidebar */}
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stats Overview
                  </Typography>
                  <Box sx={{ '& > *': { mb: 2 } }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Walks
                      </Typography>
                      <Typography variant="h5">{tasks.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Recent Activity
                      </Typography>
                      <Typography variant="body2">
                        {tasks.length > 0 ? 'You have active tasks.' : 'No recent activity.'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button variant="outlined" fullWidth onClick={() => navigate('/schedule')}>
                      Set Availability
                    </Button>
                    <Button variant="outlined" fullWidth onClick={() => navigate('/settings')}>
                      Update Rates
                    </Button>
                    <Button variant="outlined" fullWidth onClick={() => navigate('/analytics')}>
                      View Analytics
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Create Task Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request a Guide</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <TextField
              label="Pickup location"
              fullWidth
              value={newTask.pickupAddress}
              onChange={(e) => setNewTask({ ...newTask, pickupAddress: e.target.value })}
            />
            <TextField
              label="Destination"
              fullWidth
              value={newTask.destinationAddress}
              onChange={(e) => setNewTask({ ...newTask, destinationAddress: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Estimated fare (UGX)"
                  type="number"
                  fullWidth
                  value={newTask.price}
                  onChange={(e) => setNewTask({ ...newTask, price: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={newTask.duration}
                    label="Duration"
                    onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                  >
                    <MenuItem value={30}>30 mins</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {quoteInfo && (
              <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Estimated distance: {Number(quoteInfo.distance_km || 0).toFixed(2)} km
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estimated duration: {quoteInfo.duration_min} mins
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  Fare estimate: UGX {Number(quoteInfo.fare_estimate || 0).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={createTaskLoading}>Cancel</Button>
          <Button variant="outlined" onClick={handleGetQuote} disabled={quoteLoading || createTaskLoading}>
            {quoteLoading ? 'Calculating...' : 'Calculate Fare'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTask} 
            disabled={createTaskLoading}
          >
            {createTaskLoading ? 'Submitting...' : 'Pay & Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tasks;
