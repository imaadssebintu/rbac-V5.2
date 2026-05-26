import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Avatar, Divider, CircularProgress, Button } from '@mui/material';
import { taskAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Itinerary = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // pass role so backend can return tasks relevant to this user
        const role = (user?.role || '').toLowerCase();
        const resp = await taskAPI.getUserTasks(userId || user?.id, role);
        setTasks(resp.data?.tasks || resp.data || []);
      } catch (err) {
        console.error('Failed to load itinerary', err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, user]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  if (!tasks.length) return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">No itinerary items found.</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <List>
        {tasks.map(task => (
          <React.Fragment key={task.id}>
            <ListItem sx={{ alignItems: 'flex-start' }}>
              <Avatar src={task.guide?.profile_image} sx={{ mr: 2 }}>
                {task.guide?.name?.charAt(0)}
              </Avatar>
              <ListItemText
                primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">{task.title || 'Walk/Task'}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(task.scheduled_at || task.created_at).toLocaleString()}</Typography>
                </Box>}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">{task.description || task.notes}</Typography>
                    {task.guide && (
                      <Button size="small" onClick={() => navigate(`/guides/${task.guide.id}`)}>View Guide</Button>
                    )}
                  </>
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default Itinerary;
