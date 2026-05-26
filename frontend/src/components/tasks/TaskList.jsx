import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  MoreVert,
  LocationOn,
  AccessTime,
  AttachMoney,
  Pets,
  Person,
  CheckCircle,
  Pending,
  Cancel,
  DirectionsWalk,
  Edit,
  Delete,
  Share
} from '@mui/icons-material';
import { formatDate, formatCurrency } from '../../utils/helpers';

const TaskList = ({ tasks, onTaskSelect, onTaskAction, editable = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Pending />;
      case 'accepted': return <CheckCircle />;
      case 'in_progress': return <DirectionsWalk />;
      case 'completed': return <CheckCircle color="success" />;
      case 'cancelled': return <Cancel />;
      default: return null;
    }
  };

  const handleMenuOpen = (event, task) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTask(null);
  };

  const handleAction = (action) => {
    if (selectedTask && onTaskAction) {
      onTaskAction(selectedTask.id, action);
    }
    handleMenuClose();
  };

  const TaskCard = ({ task }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

    return (
      <Card
        sx={{
          mb: 2,
          cursor: 'pointer',
          borderLeft: 4,
          borderColor: isOverdue ? 'error.main' : `${getStatusColor(task.status)}.main`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
            transition: 'all 0.2s ease'
          }
        }}
        onClick={() => onTaskSelect && onTaskSelect(task)}
      >
        <CardContent>
          {/* Task Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {task.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={task.status}
                  color={getStatusColor(task.status)}
                  size="small"
                  icon={getStatusIcon(task.status)}
                />

                {isOverdue && (
                  <Chip
                    label="Overdue"
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                )}

                {task.priority && task.priority !== 'normal' && (
                  <Chip
                    label={task.priority}
                    color={task.priority === 'high' ? 'error' : 'warning'}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, task)}
            >
              <MoreVert />
            </IconButton>
          </Box>

          {/* Task Description */}
          {task.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {task.description}
            </Typography>
          )}

          {/* Task Details */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {task.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {task.location}
                </Typography>
              </Box>
            )}

            {task.duration && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {task.duration} min
                </Typography>
              </Box>
            )}

            {task.price && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(task.price)}
                </Typography>
              </Box>
            )}

            {task.pets && task.pets.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Pets sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {task.pets.join(', ')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Guide/Traveler Info */}
          {(task.walker || task.user) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
              <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
                {task.walker && (
                  <Avatar src={task.walker.profilePicture}>
                    {task.walker.name?.charAt(0)}
                  </Avatar>
                )}
                {task.user && (
                  <Avatar src={task.user.profilePicture}>
                    {task.user.name?.charAt(0)}
                  </Avatar>
                )}
              </AvatarGroup>
              <Typography variant="body2">
                {task.walker?.name || task.user?.name}
              </Typography>
            </Box>
          )}

          {/* Dates */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {task.dueDate && `Due: ${formatDate(task.dueDate, 'short')}`}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Created: {formatDate(task.createdAt, 'relative')}
            </Typography>
          </Box>

          {/* Progress (for in_progress tasks) */}
          {task.status === 'in_progress' && task.progress !== undefined && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={task.progress}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {task.progress}% complete
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {tasks.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <DirectionsWalk sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {editable ? 'Create your first guide request' : 'No available guide requests at the moment'}
          </Typography>
        </Card>
      ) : (
        tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))
      )}

      {/* Task Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTask && (
          <>
            <MenuItem onClick={() => handleAction('view')}>
              View Details
            </MenuItem>

            {editable && selectedTask.status === 'pending' && (
              <MenuItem onClick={() => handleAction('edit')}>
                <Edit sx={{ mr: 1 }} />
                Edit
              </MenuItem>
            )}

            {editable && ['pending', 'accepted'].includes(selectedTask.status) && (
              <MenuItem onClick={() => handleAction('cancel')} sx={{ color: 'error.main' }}>
                <Cancel sx={{ mr: 1 }} />
                Cancel
              </MenuItem>
            )}

            {selectedTask.status === 'accepted' && (
              <MenuItem onClick={() => handleAction('start')}>
                <DirectionsWalk sx={{ mr: 1 }} />
                Start Trip
              </MenuItem>
            )}

            {selectedTask.status === 'in_progress' && (
              <MenuItem onClick={() => handleAction('complete')}>
                <CheckCircle sx={{ mr: 1 }} />
                Complete
              </MenuItem>
            )}

            <MenuItem onClick={() => handleAction('share')}>
              <Share sx={{ mr: 1 }} />
              Share
            </MenuItem>

            {editable && (
              <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
                <Delete sx={{ mr: 1 }} />
                Delete
              </MenuItem>
            )}
          </>
        )}
      </Menu>
    </Box>
  );
};

export default TaskList;
