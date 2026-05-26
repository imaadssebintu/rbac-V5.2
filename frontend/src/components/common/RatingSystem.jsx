import React, { useState, useEffect } from 'react';
import {
  Box,
  Rating,
  Typography,
  Avatar,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Star,
  StarBorder,
  StarHalf,
  RateReview,
  ThumbUp,
  ThumbDown
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { ratingAPI } from '../../services/api';

const RatingSystem = ({
  userId,
  walkerId,
  taskId,
  readonly = false,
  showStats = true
}) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(-1);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0]
  });
  const [openReview, setOpenReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (walkerId) {
      fetchRatings();
      fetchReviews();
    }
  }, [walkerId]);

  const fetchRatings = async () => {
    try {
      const response = await ratingAPI.getWalkerRatings(walkerId);
      setStats(response.data.stats);
      setRating(response.data.stats.average);

      // Check if current user has rated
      if (user) {
        const userRating = response.data.reviews.find(r => r.userId === user.id);
        if (userRating) {
          setUserRating(userRating.rating);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await ratingAPI.getReviews(walkerId);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleRatingSubmit = async (value) => {
    if (readonly || !user) return;

    try {
      await ratingAPI.submitRating({
        walkerId,
        userId: user.id,
        taskId,
        rating: value,
        review: reviewText
      });

      setUserRating(value);
      if (reviewText) {
        setOpenReview(false);
        setReviewText('');
      }

      fetchRatings();
      fetchReviews();
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const labels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  const getRatingDistribution = () => {
    return (
      <Box sx={{ mt: 2 }}>
        {[5, 4, 3, 2, 1].map((star) => (
          <Box key={star} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 30 }}>
              {star}
            </Typography>
            <Star sx={{ fontSize: 16, color: 'warning.main', mr: 1 }} />
            <LinearProgress
              variant="determinate"
              value={(stats.distribution[star - 1] / stats.total) * 100 || 0}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" sx={{ minWidth: 40, ml: 1 }}>
              {stats.distribution[star - 1] || 0}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {/* Rating Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ mr: 1 }}>
            {rating.toFixed(1)}
          </Typography>
          <Rating
            value={rating}
            precision={0.5}
            readOnly={readonly}
            onChange={(event, newValue) => {
              if (!readonly && user) {
                setOpenReview(true);
              }
            }}
            onChangeActive={(event, newHover) => {
              setHover(newHover);
            }}
            icon={<Star fontSize="inherit" />}
            emptyIcon={<StarBorder fontSize="inherit" />}
          />
          {hover !== -1 && (
            <Typography sx={{ ml: 2 }}>
              {labels[hover]}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary">
          ({stats.total} reviews)
        </Typography>

        {!readonly && user && (
          <Button
            variant="outlined"
            startIcon={<RateReview />}
            onClick={() => setOpenReview(true)}
            disabled={!!userRating}
          >
            {userRating ? 'You Rated' : 'Add Review'}
          </Button>
        )}
      </Box>

      {/* Rating Stats */}
      {showStats && stats.total > 0 && (
        <Box sx={{ mt: 3 }}>
          {getRatingDistribution()}
        </Box>
      )}

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Recent Reviews
          </Typography>
          <List>
            {reviews.slice(0, 3).map((review, index) => (
              <React.Fragment key={review.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar src={review.user?.profilePicture}>
                      {review.user?.name?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1">
                          {review.user?.name}
                        </Typography>
                        <Rating value={review.rating} size="small" readOnly />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ display: 'block', mt: 1 }}
                        >
                          {review.review}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < reviews.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {/* Review Dialog */}
      <Dialog open={openReview} onClose={() => setOpenReview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rate Your Experience</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom>
              How was your walk?
            </Typography>

            <Rating
              value={userRating}
              size="large"
              onChange={(event, newValue) => {
                setUserRating(newValue);
              }}
              sx={{ fontSize: 48, my: 2 }}
            />

            {userRating > 0 && (
              <Typography variant="h6" color="primary" gutterBottom>
                {labels[userRating]}
              </Typography>
            )}

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Your review (optional)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this guide..."
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReview(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleRatingSubmit(userRating)}
            disabled={!userRating}
          >
            Submit Rating
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RatingSystem;
