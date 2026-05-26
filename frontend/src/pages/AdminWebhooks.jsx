import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Container,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminWebhooks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    eventType: '',
    verificationStatus: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, limit: 20 });

  useEffect(() => {
    if (user && (user.role || '').toLowerCase() !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchEvents();
  }, [filters, pagination.page, pagination.limit]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.listPayPalWebhooks({
        event_type: filters.eventType || undefined,
        verification_status: filters.verificationStatus || undefined,
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      setEvents(response.data?.events || []);
      setPagination((prev) => ({
        ...prev,
        pages: response.data?.pagination?.pages || 1
      }));
    } catch (error) {
      console.error('Error loading PayPal webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            PayPal Webhook Audit Log
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              label="Event type"
              value={filters.eventType}
              onChange={(event) => handleFilterChange('eventType', event.target.value)}
              size="small"
            />
            <TextField
              select
              label="Verification"
              value={filters.verificationStatus}
              onChange={(event) => handleFilterChange('verificationStatus', event.target.value)}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="SUCCESS">SUCCESS</MenuItem>
              <MenuItem value="FAILED">FAILED</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="received">Received</MenuItem>
              <MenuItem value="processed">Processed</MenuItem>
            </TextField>
            <TextField
              type="date"
              label="Start"
              size="small"
              value={filters.startDate}
              onChange={(event) => handleFilterChange('startDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End"
              size="small"
              value={filters.endDate}
              onChange={(event) => handleFilterChange('endDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          {loading ? (
            <Typography color="text.secondary">Loading events...</Typography>
          ) : events.length === 0 ? (
            <Typography color="text.secondary">No webhook events found.</Typography>
          ) : (
            <Stack spacing={1}>
              {events.map((event) => (
                <Box key={event.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                  <Typography variant="subtitle2">{event.event_type}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.event_id} • {event.verification_status} • {event.status}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Pagination
              count={pagination.pages}
              page={pagination.page}
              onChange={(event, page) => setPagination((prev) => ({ ...prev, page }))}
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AdminWebhooks;
