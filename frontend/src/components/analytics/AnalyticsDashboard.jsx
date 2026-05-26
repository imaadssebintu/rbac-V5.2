import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
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
import {
  TrendingUp,
  AttachMoney,
  DirectionsWalk,
  Schedule,
  Star,
  Pets
} from '@mui/icons-material';
import { analyticsAPI } from '../../services/api';

const AnalyticsDashboard = ({ userId, role }) => {
  const [timeRange, setTimeRange] = useState('month');
  const [analyticsData, setAnalyticsData] = useState({
    summary: {},
    revenue: [],
    walks: [],
    ratings: [],
    pets: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getUserAnalytics(userId, timeRange);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const summaryCards = [
    {
      title: 'Total Trips',
      value: analyticsData.summary.totalWalks || 0,
      icon: <DirectionsWalk />,
      color: '#4A90E2',
      change: '+12%'
    },
    {
      title: 'Total Revenue',
      value: `$${analyticsData.summary.totalRevenue || 0}`,
      icon: <AttachMoney />,
      color: '#2ECC71',
      change: '+18%'
    },
    {
      title: 'Avg. Rating',
      value: analyticsData.summary.averageRating || 0,
      icon: <Star />,
      color: '#F39C12',
      change: '+0.3'
    },
    {
      title: 'Active Pets',
      value: analyticsData.summary.activePets || 0,
      icon: <Pets />,
      color: '#9B59B6',
      change: '+2'
    }
  ];

  const revenueChartData = analyticsData.revenue || [];
  const walksChartData = analyticsData.walks || [];
  const ratingDistribution = analyticsData.ratings || [];
  const petPopularity = analyticsData.pets || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Analytics Dashboard
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, value) => value && setTimeRange(value)}
            size="small"
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="quarter">Quarter</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>View As</InputLabel>
            <Select value="walker" label="View As">
              <MenuItem value="walker">Guide</MenuItem>
              <MenuItem value="walkee">Traveler</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <TrendingUp sx={{ color: '#2ECC71', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="caption" sx={{ color: '#2ECC71' }}>
                    {card.change} from last {timeRange}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="walks"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Trips"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Rating Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rating Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ratings`]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Trips by Day */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trips by Day of Week
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={walksChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="walks" fill="#4A90E2" name="Trips" />
                  <Bar dataKey="revenue" fill="#2ECC71" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Pet Popularity */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pet Popularity
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={petPopularity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="walks" fill="#9B59B6" name="Trips" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Peak Hours
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {['7-9 AM', '12-2 PM', '5-7 PM'].map((time, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      minWidth: 120,
                      p: 2,
                      bgcolor: index === 1 ? 'primary.light' : 'background.default',
                      borderRadius: 2,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="h6">{time}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {index === 1 ? 'Most Popular' : 'Popular'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {index === 1 ? '45 trips/week' : '30 trips/week'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Clients
              </Typography>
              <Box sx={{ mt: 2 }}>
                {[
                  { name: 'Sarah Johnson', walks: 24, revenue: 1200 },
                  { name: 'Mike Chen', walks: 18, revenue: 900 },
                  { name: 'Emma Wilson', walks: 15, revenue: 750 }
                ].map((client, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 2 ? '1px solid' : 'none',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="body1">{client.name}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{client.walks} walks</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${client.revenue}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
