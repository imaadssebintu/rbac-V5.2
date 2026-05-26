import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Typography, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider } from '@mui/material';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const TaskMap = ({ tasks = [], userLocation }) => {
  const defaultCenter = [40.7128, -74.0060]; // NYC
  const defaultZoom = 12;
  const [selectedMarker, setSelectedMarker] = useState(null);

  const toMinutesFromKm = (distanceKm, speedKmh = 30) => {
    const km = Number(distanceKm);
    if (!Number.isFinite(km) || km <= 0) return null;
    return Math.max(1, Math.round((km / speedKmh) * 60));
  };

  const MapAutoFit = ({ points }) => {
    const map = useMap();

    useEffect(() => {
      if (!Array.isArray(points) || points.length === 0) {
        return;
      }

      const validPoints = points.filter((point) => Array.isArray(point) && point.length === 2);
      if (validPoints.length === 0) {
        return;
      }

      if (validPoints.length === 1) {
        map.setView(validPoints[0], 14);
        return;
      }

      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [map, points]);

    return null;
  };

  const customIcon = (type) => {
    const preset = {
      walker: { background: '#E4405F', glyph: '👤' },
      guide: { background: '#E4405F', glyph: '👤' },
      traveler: { background: '#4A90E2', glyph: '📍' },
      user: { background: '#4A90E2', glyph: '📍' },
      current: { background: '#4A90E2', glyph: '📍' },
      pickup: { background: '#0B6E99', glyph: '🎯' },
      destination: { background: '#2FBF8F', glyph: '🏁' },
      car: { background: '#7C5EF1', glyph: '🚗' },
      motorcycle: { background: '#F28C28', glyph: '🏍️' },
      transport: { background: '#F28C28', glyph: '🏍️' },
      'active-trip': { background: '#2FBF8F', glyph: '⏱️' },
      default: { background: '#4A90E2', glyph: '📍' }
    };
    const markerConfig = preset[type] || preset.default;

    return L.divIcon({
      html: `
        <div style="
          background: ${markerConfig.background};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 15px;
          line-height: 1;
          animation: ${type === 'active-trip' ? 'pulse-trip-marker 1.8s ease-in-out infinite' : 'none'};
        ">
          ${markerConfig.glyph}
        </div>
        <style>
          @keyframes pulse-trip-marker {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(47,191,143,0.45); }
            70% { transform: scale(1.08); box-shadow: 0 0 0 16px rgba(47,191,143,0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(47,191,143,0); }
          }
        </style>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  const getLatLng = (task) => {
    if (!task) return null;

    const directLat = Number(task.latitude ?? task.lat ?? task.location?.lat ?? task.pickup_location?.lat ?? task.destination?.lat);
    const directLng = Number(task.longitude ?? task.lng ?? task.location?.lng ?? task.pickup_location?.lng ?? task.destination?.lng);

    if (Number.isFinite(directLat) && Number.isFinite(directLng)) {
      return [directLat, directLng];
    }

    if (Array.isArray(task.coordinates) && task.coordinates.length >= 2) {
      const lat = Number(task.coordinates[1]);
      const lng = Number(task.coordinates[0]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }

    return null;
  };

  const normalizedUserLocation = Array.isArray(userLocation)
    ? userLocation
    : Number.isFinite(Number(userLocation?.lat)) && Number.isFinite(Number(userLocation?.lng))
      ? [Number(userLocation.lat), Number(userLocation.lng)]
      : null;

  const getDistanceFromUserKm = (coords) => {
    if (!normalizedUserLocation || !Array.isArray(coords) || coords.length !== 2) return null;
    const [uLat, uLng] = normalizedUserLocation;
    const [mLat, mLng] = coords;
    if (![uLat, uLng, mLat, mLng].every((value) => Number.isFinite(Number(value)))) return null;

    const toRad = (deg) => (Number(deg) * Math.PI) / 180;
    const dLat = toRad(mLat - uLat);
    const dLng = toRad(mLng - uLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(uLat)) * Math.cos(toRad(mLat))
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  };

  const markersWithCoords = useMemo(() => {
    return tasks
      .map((task, index) => {
        const coords = getLatLng(task);
        if (!coords) return null;
        return {
          key: task.id || task.taskId || task.taskRef || index,
          task,
          coords
        };
      })
      .filter(Boolean);
  }, [tasks]);

  const mapPoints = useMemo(() => {
    const points = markersWithCoords.map((entry) => entry.coords);
    if (normalizedUserLocation) {
      points.push(normalizedUserLocation);
    }
    return points;
  }, [markersWithCoords, normalizedUserLocation]);

  const routeSegments = useMemo(() => {
    const groupedByTask = new Map();

    markersWithCoords.forEach(({ task, coords }) => {
      const taskRef = task.taskRef || task.task_id || task.id;
      if (!taskRef) return;

      if (!groupedByTask.has(taskRef)) {
        groupedByTask.set(taskRef, []);
      }
      groupedByTask.get(taskRef).push({ task, coords });
    });

    const segments = [];

    groupedByTask.forEach((entries) => {
      const guidePoint = entries.find(({ task }) => task.pointKind === 'guide' || task.markerType === 'walker' || task.markerType === 'guide');
      const pickupPoint = entries.find(({ task }) => task.pointKind === 'pickup' || task.pointKind === 'traveler' || task.markerType === 'traveler' || task.markerType === 'motorcycle');
      const destinationPoint = entries.find(({ task }) => task.pointKind === 'destination' || task.markerType === 'destination');

      if (guidePoint && pickupPoint) {
        segments.push({
          points: [guidePoint.coords, pickupPoint.coords],
          options: { color: '#F28C28', weight: 4, opacity: 0.9, dashArray: '10 6' }
        });
      }

      if (pickupPoint && destinationPoint) {
        segments.push({
          points: [pickupPoint.coords, destinationPoint.coords],
          options: { color: '#2FBF8F', weight: 5, opacity: 0.85 }
        });
      }
    });

    return segments;
  }, [markersWithCoords]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 260,
        maxHeight: 520,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        background: 'linear-gradient(180deg, rgba(74,144,226,0.08) 0%, rgba(255,255,255,1) 100%)',
        p: 1
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          bgcolor: 'rgba(255,255,255,0.94)',
          borderRadius: 2,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          p: 1
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          <Chip size="small" label="📍 Traveler" sx={{ fontWeight: 600 }} />
          <Chip size="small" label="👤 Guide" sx={{ fontWeight: 600 }} />
          <Chip size="small" label="🏍️ Motorbike" sx={{ fontWeight: 600 }} />
          <Chip size="small" label="🏁 Destination" sx={{ fontWeight: 600 }} />
        </Stack>
      </Box>

      <MapContainer
        center={normalizedUserLocation || defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {normalizedUserLocation && (
          <Circle
            center={normalizedUserLocation}
            radius={320}
            pathOptions={{ color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.1 }}
          />
        )}

        {routeSegments.map((segment, index) => (
          <Polyline key={`route-${index}`} positions={segment.points} pathOptions={segment.options} />
        ))}

        <MapAutoFit points={mapPoints} />

        {markersWithCoords.map(({ task, coords, key }, index) => {
          const markerType = task.markerType || 'task';
          const fallbackDistanceKm = getDistanceFromUserKm(coords);
          const displayDistanceKm = Number.isFinite(Number(task.distance))
            ? Number(task.distance)
            : Number.isFinite(Number(task.distanceKm))
              ? Number(task.distanceKm)
              : fallbackDistanceKm;

          const latitudeValue = Number(task?.latitude ?? task?.lat ?? coords?.[0]);
          const longitudeValue = Number(task?.longitude ?? task?.lng ?? coords?.[1]);
          const hasValidCoordinates = Number.isFinite(latitudeValue) && Number.isFinite(longitudeValue);

          return (
            <Marker key={`${key}-${index}`} position={coords} icon={customIcon(markerType)}>
              <Popup>
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {task.title || task.name || 'Location'}
                  </Typography>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  )}
                  {Number.isFinite(displayDistanceKm) && (
                    <Typography variant="caption" display="block">
                      Distance from you: {Number(displayDistanceKm).toFixed(2)} km
                    </Typography>
                  )}
                  {hasValidCoordinates && (
                    <Typography variant="caption" display="block">
                      Coordinates: {latitudeValue.toFixed(5)}, {longitudeValue.toFixed(5)}
                    </Typography>
                  )}
                  {task.transportFee != null && (
                    <Typography variant="caption" display="block">
                      Transport fee: ${task.transportFee}
                    </Typography>
                  )}
                  {task.paidAmount != null && (
                    <Typography variant="caption" display="block">
                      Paid amount: ${task.paidAmount}
                    </Typography>
                  )}
                  {task.price != null && (
                    <Typography variant="caption" display="block">
                      Price: ${task.price}
                    </Typography>
                  )}
                  {Number.isFinite(Number(task.etaRemainingMinutes)) && (
                    <Typography variant="caption" display="block">
                      Guide ETA: {task.etaRemainingMinutes} min
                    </Typography>
                  )}
                  {task.destinationAddress && (
                    <Typography variant="caption" display="block">
                      Going to: {task.destinationAddress}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    sx={{ mt: 1, textTransform: 'none' }}
                    onClick={() => setSelectedMarker(task)}
                  >
                    Open full profile
                  </Button>
                </div>
              </Popup>
              
            </Marker>
          );
        })}
      </MapContainer>

      <Dialog
        open={Boolean(selectedMarker)}
        onClose={() => setSelectedMarker(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedMarker?.title || selectedMarker?.name || 'Trip details'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">
              {selectedMarker?.description || 'No description available.'}
            </Typography>
            <Divider />
            {selectedMarker?.travelerName && (
              <Typography variant="body2"><strong>Traveler:</strong> {selectedMarker.travelerName}</Typography>
            )}
            {selectedMarker?.guideName && (
              <Typography variant="body2"><strong>Guide:</strong> {selectedMarker.guideName}</Typography>
            )}
            {(selectedMarker?.distance || selectedMarker?.distanceKm) && (
              <Typography variant="body2">
                <strong>Distance:</strong> {Number(selectedMarker.distance || selectedMarker.distanceKm).toFixed(2)} km
              </Typography>
            )}
            <Typography variant="body2">
              <strong>ETA:</strong> {selectedMarker?.etaRemainingMinutes ?? toMinutesFromKm(selectedMarker?.distance || selectedMarker?.distanceKm) ?? 'N/A'} min
            </Typography>
            <Typography variant="body2">
              <strong>Paid Amount:</strong> ${Number(selectedMarker?.paidAmount || 0).toFixed(2)}
            </Typography>
            <Typography variant="body2">
              <strong>Going To:</strong> {selectedMarker?.destinationAddress || 'Not available'}
            </Typography>
            <Typography variant="body2">
              <strong>Time:</strong> {selectedMarker?.scheduledTime || 'Not available'}
            </Typography>
            <Typography variant="body2">
              <strong>Weather:</strong> {selectedMarker?.weather || 'Not available'}
            </Typography>
            <Typography variant="body2">
              <strong>Location:</strong> {
                Number.isFinite(Number(selectedMarker?.latitude)) && Number.isFinite(Number(selectedMarker?.longitude))
                  ? `${Number(selectedMarker?.latitude).toFixed(5)}, ${Number(selectedMarker?.longitude).toFixed(5)}`
                  : 'Not available'
              }
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMarker(null)}>Close</Button>
          <Button
            variant="outlined"
            disabled={!selectedMarker?.phone}
            onClick={() => {
              if (selectedMarker?.phone) {
                window.location.href = `tel:${selectedMarker.phone}`;
              }
            }}
          >
            Call
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              window.location.href = '/messages';
            }}
          >
            Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskMap;
