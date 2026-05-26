import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Typography, Button, Avatar, Chip } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to recenter map when coordinates change
const MapRecenter = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const ProfessionalMap = ({ center = [51.505, -0.09], users = [], height = '380px' }) => {
  return (
    <Box
      sx={{
        height,
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
        bgcolor: 'background.paper',
        p: 1
      }}
    >
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        {/* Professional Map Tiles (CartoDB Voyager) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapRecenter lat={center[0]} lng={center[1]} />

        {/* Current User Location */}
        <Marker position={center}>
          <Popup>
            <Typography variant="subtitle2">You are here</Typography>
          </Popup>
        </Marker>

        {/* Other Users */}
        {users.map((user) => (
          <Marker 
            key={user.id} 
            position={[
              // Generate slightly randomized position around center if no real coords
              // In real app, use user.latitude/longitude
              center[0] + (Math.random() - 0.5) * 0.02, 
              center[1] + (Math.random() - 0.5) * 0.02
            ]}
          >
            <Popup>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar src={user.profilePicture} sx={{ width: 40, height: 40, mx: 'auto', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">{(user.role || 'Guide').replace(/walker/i, 'Guide').replace(/walkee/i, 'Traveler')}</Typography>
                {user.rating && (
                    <Chip size="small" label={`${user.rating} ★`} color="primary" sx={{ mt: 0.5 }} />
                )}
                <Button size="small" sx={{ mt: 1 }} variant="contained" href={`/profile/${user.id}`}>
                    View Profile
                </Button>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default ProfessionalMap;