import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Badge
} from '@mui/material';
import {
  CalendarToday,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  LocationOn,
  Pets
} from '@mui/icons-material';
import { LocalizationProvider, DateCalendar, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { scheduleAPI } from '../../services/api';

const ScheduleCalendar = ({ userId: propUserId, role: propRole }) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const role = propRole || (user?.role || 'walkee').toLowerCase();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // 1 hour later
    location: '',
    pets: [],
    repeat: 'none',
    walkerId: null
  });

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate, userId]);

  const fetchSchedules = async () => {
    try {
      const response = await scheduleAPI.getUserSchedules(userId, selectedDate);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotClick = (time) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(time, 0, 0, 0);

    setFormData(prev => ({
      ...prev,
      date: newDate,
      startTime: newDate,
      endTime: new Date(newDate.getTime() + 3600000)
    }));
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const scheduleData = {
        ...formData,
        userId,
        status: 'pending'
      };

      if (editingSchedule) {
        await scheduleAPI.update(editingSchedule.id, scheduleData);
      } else {
        await scheduleAPI.create(scheduleData);
      }

      setOpenDialog(false);
      setEditingSchedule(null);
      setFormData({
        title: '',
        description: '',
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        location: '',
        pets: [],
        repeat: 'none',
        walkerId: null
      });

      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await scheduleAPI.delete(id);
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    const currentSchedules = Array.isArray(schedules) ? schedules : [];
    for (let hour = 6; hour < 22; hour++) {
      slots.push({
        time: hour,
        schedules: currentSchedules.filter(s => {
          const scheduleHour = new Date(s.startTime).getHours();
          return scheduleHour === hour;
        })
      });
    }
    return slots;
  };

  const renderTimeSlots = () => {
    return getTimeSlots().map((slot) => (
      <Box key={slot.time} sx={{ display: 'flex', mb: 2 }}>
        <Box sx={{ width: 80, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {slot.time % 12 || 12}:00 {slot.time >= 12 ? 'PM' : 'AM'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 60 }}>
          {slot.schedules.map((schedule) => (
            <Card
              key={schedule.id}
              sx={{
                mb: 1,
                bgcolor: schedule.status === 'confirmed' ? 'success.light' :
                         schedule.status === 'pending' ? 'warning.light' :
                         'background.paper',
                cursor: 'pointer'
              }}
              onClick={() => {
                setEditingSchedule(schedule);
                setFormData({
                  title: schedule.title,
                  description: schedule.description,
                  date: new Date(schedule.date),
                  startTime: new Date(schedule.startTime),
                  endTime: new Date(schedule.endTime),
                  location: schedule.location,
                  pets: schedule.pets,
                  repeat: schedule.repeat,
                  walkerId: schedule.walkerId
                });
                setOpenDialog(true);
              }}
            >
              <CardContent sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">
                    {schedule.title}
                  </Typography>
                  <Chip
                    label={schedule.status}
                    size="small"
                    color={
                      schedule.status === 'confirmed' ? 'success' :
                      schedule.status === 'pending' ? 'warning' : 'default'
                    }
                  />
                </Box>
                {schedule.location && (
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <LocationOn sx={{ fontSize: 12, mr: 0.5 }} />
                    {schedule.location}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}

          {slot.schedules.length === 0 && (
            <Button
              variant="outlined"
              fullWidth
              sx={{ height: 60, borderStyle: 'dashed' }}
              onClick={() => handleTimeSlotClick(slot.time)}
            >
              <Add /> Add Walk
            </Button>
          )}
        </Box>
      </Box>
    ));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Schedule
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingSchedule(null);
              setOpenDialog(true);
            }}
          >
            New Schedule
          </Button>
        </Box>

        {/* Calendar and Schedule View */}
        <Grid container spacing={3}>
          {/* Calendar */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <DateCalendar
                  value={selectedDate}
                  onChange={handleDateChange}
                  showDaysOutsideCurrentMonth
                />

                {/* Quick Stats */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Today's Schedule
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Badge badgeContent={schedules.filter(s => s.status === 'pending').length} color="warning">
                        <Schedule color="action" />
                      </Badge>
                      <Typography variant="caption" display="block">
                        Pending
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Badge badgeContent={schedules.filter(s => s.status === 'confirmed').length} color="success">
                        <CheckCircle color="action" />
                      </Badge>
                      <Typography variant="caption" display="block">
                        Confirmed
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Badge badgeContent={schedules.length} color="primary">
                        <CalendarToday color="action" />
                      </Badge>
                      <Typography variant="caption" display="block">
                        Total
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Time Slots */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Typography>

                <Box sx={{ mt: 2, maxHeight: 500, overflow: 'auto' }}>
                  {renderTimeSlots()}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Schedule Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingSchedule ? 'Edit Schedule' : 'New Trip Schedule'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Trip Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Morning city trip"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any special instructions..."
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(newValue) => setFormData({ ...formData, startTime: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(newValue) => setFormData({ ...formData, endTime: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where to meet"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pets (comma separated)"
                  value={formData.pets.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    pets: e.target.value.split(',').map(pet => pet.trim())
                  })}
                  placeholder="e.g., Max, Bella, Charlie"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Repeat"
                  value={formData.repeat}
                  onChange={(e) => setFormData({ ...formData, repeat: e.target.value })}
                  SelectProps={{ native: true }}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="weekends">Weekends only</option>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            {editingSchedule && (
              <Button
                color="error"
                onClick={() => handleDelete(editingSchedule.id)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!formData.title}
            >
              {editingSchedule ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ScheduleCalendar;
