import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfessionalMap from '../components/common/Map';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  Pagination,
  Badge
} from '@mui/material';
import {
  Search,
  FilterList,
  Favorite,
  FavoriteBorder,
  LocationOn,
  Star,
  Pets,
  DirectionsWalk,
  AttachMoney,
  Share,
  Bookmark,
  BookmarkBorder,
  Sort
} from '@mui/icons-material';

const ExplorePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sortBy: 'rating',
    minRating: 0,
    maxDistance: 10,
    priceRange: [10, 100],
    services: []
  });
  const [walkers, setWalkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchWalkers();
  }, [filters, page]);

  const fetchWalkers = async () => {
    setLoading(true);

    // Mock data - replace with API call
    const mockWalkers = [
      {
        id: 1,
        name: 'Alex Guide',
        profilePicture: null,
        rating: 4.8,
        totalReviews: 124,
        distance: 1.2,
        price: 25,
        services: ['City Guiding', 'Local Assistance', 'Trip Planning'],
        description: 'Professional local guide with 5+ years experience. Specialized in safe city trips.',
        availability: 'Weekdays 9AM-6PM',
        pets: ['Dogs', 'Cats'],
        isFavorite: false,
        isBookmarked: false
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        profilePicture: null,
        rating: 4.9,
        totalReviews: 89,
        distance: 2.5,
        price: 30,
        services: ['City Guiding', 'Photo Stops'],
        description: 'Friendly local host available for morning and evening trips.',
        availability: 'Flexible',
        pets: ['Dogs', 'Cats', 'Small Pets'],
        isFavorite: true,
        isBookmarked: true
      },
      {
        id: 3,
        name: 'Mike Chen',
        profilePicture: null,
        rating: 4.7,
        totalReviews: 56,
        distance: 3.8,
        price: 22,
        services: ['Neighborhood Tours', 'Local Transport Help'],
        description: 'Reliable and punctual. Certified in local safety support.',
        availability: 'Weekends',
        pets: ['Dogs'],
        isFavorite: false,
        isBookmarked: false
      }
    ];

    setWalkers(mockWalkers);
    setTotalPages(3);
    setLoading(false);
  };

  const handleFavorite = (walkerId) => {
    setWalkers(walkers.map(walker =>
      walker.id === walkerId ? { ...walker, isFavorite: !walker.isFavorite } : walker
    ));
  };

  const handleBookmark = (walkerId) => {
    setWalkers(walkers.map(walker =>
      walker.id === walkerId ? { ...walker, isBookmarked: !walker.isBookmarked } : walker
    ));
  };

  const handleShare = (walkerId) => {
    const walker = walkers.find(w => w.id === walkerId);
    navigator.clipboard.writeText(`${window.location.origin}/guides/${walkerId}`);
    alert(`Link to ${walker?.name}'s profile copied to clipboard!`);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const servicesOptions = ['City Guiding', 'Local Assistance', 'Trip Planning', 'Photo Stops', 'Neighborhood Tours', 'Local Transport Help'];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Explore Guides
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Discover professional guides near you
      </Typography>

      {/* Map View */}
      <Box sx={{ mb: 4 }}>
        <ProfessionalMap 
           center={[0.3476, 32.5825]} // Default to Kampala/Entebbe region based on context
           users={walkers}
           height="400px"
        />
      </Box>

      {/* Search and Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search guides by name, services..."
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

            {/* Sort */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Sort by"
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  startAdornment={<Sort sx={{ mr: 1 }} />}
                >
                  <MenuItem value="rating">Highest Rating</MenuItem>
                  <MenuItem value="distance">Nearest</MenuItem>
                  <MenuItem value="price_low">Price: Low to High</MenuItem>
                  <MenuItem value="price_high">Price: High to Low</MenuItem>
                  <MenuItem value="reviews">Most Reviews</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Rating Filter */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Min Rating</InputLabel>
                <Select
                  value={filters.minRating}
                  label="Min Rating"
                  onChange={(e) => handleFilterChange('minRating', e.target.value)}
                >
                  <MenuItem value={0}>Any Rating</MenuItem>
                  <MenuItem value={4}>4+ Stars</MenuItem>
                  <MenuItem value={4.5}>4.5+ Stars</MenuItem>
                  <MenuItem value={5}>5 Stars</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Additional Filters */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {servicesOptions.map(service => (
              <Chip
                key={service}
                label={service}
                onClick={() => {
                  const newServices = filters.services.includes(service)
                    ? filters.services.filter(s => s !== service)
                    : [...filters.services, service];
                  handleFilterChange('services', newServices);
                }}
                color={filters.services.includes(service) ? 'primary' : 'default'}
                variant={filters.services.includes(service) ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {walkers.length} Guides Found
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          <Typography variant="body2" color="text.secondary">
            {filters.minRating > 0 && `${filters.minRating}+ stars • `}
            Sorted by {filters.sortBy.replace('_', ' ')}
          </Typography>
        </Box>
      </Box>

      {/* Guides Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography>Loading guides...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {walkers.map((walker) => (
            <Grid item xs={12} md={6} lg={4} key={walker.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Guide Header */}
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={walker.profilePicture}
                        sx={{ width: 60, height: 60 }}
                      >
                        {walker.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {walker.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Rating value={walker.rating} size="small" readOnly precision={0.1} />
                          <Typography variant="body2" color="text.secondary">
                            ({walker.totalReviews})
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box>
                      <IconButton onClick={() => handleFavorite(walker.id)}>
                        {walker.isFavorite ? (
                          <Favorite color="error" />
                        ) : (
                          <FavoriteBorder />
                        )}
                      </IconButton>
                      <IconButton onClick={() => handleBookmark(walker.id)}>
                        {walker.isBookmarked ? (
                          <Bookmark color="primary" />
                        ) : (
                          <BookmarkBorder />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Guide Info */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {walker.description}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {walker.services.map((service, index) => (
                        <Chip
                          key={index}
                          label={service}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>

                    {/* Stats */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {walker.distance} miles
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            ${walker.price}/walk
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DirectionsWalk sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {walker.availability}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Pets sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {walker.pets.join(', ')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>

                {/* Actions */}
                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => handleShare(walker.id)}
                  >
                    Share
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      // Navigate to guide profile or start booking
                      console.log('Book guide:', walker.id);
                    }}
                  >
                    Book Now
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* No Results */}
      {!loading && walkers.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <DirectionsWalk sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No guides found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Try adjusting your filters or search terms
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters({
                sortBy: 'rating',
                minRating: 0,
                maxDistance: 10,
                priceRange: [10, 100],
                services: []
              });
              setSearchQuery('');
            }}
          >
            Clear All Filters
          </Button>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Quick Actions */}
      <Box sx={{ position: 'fixed', bottom: 80, right: 20, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          sx={{ borderRadius: 3, boxShadow: 3 }}
          onClick={() => {
            // Show map view
            console.log('Show map view');
          }}
        >
          Map View
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ borderRadius: 3, boxShadow: 3 }}
          onClick={() => {
            // Save search
            console.log('Save search');
          }}
        >
          Save Search
        </Button>
      </Box>
    </Container>
  );
};


export default ExplorePage;
