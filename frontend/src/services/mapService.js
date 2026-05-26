// Map service for handling location and map operations
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

export const mapService = {
  // Create custom icons
  createCustomIcon(type, color = '#E4405F') {
    const iconSize = type === 'user' ? 40 : type === 'task' ? 32 : 24;
    const iconClass = type === 'user' ? 'user' : type === 'task' ? 'task' : 'default';

    return L.divIcon({
      html: `
        <div class="leaflet-marker-icon ${iconClass}" style="
          background: ${color};
          width: ${iconSize}px;
          height: ${iconSize}px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${iconSize / 2}px;
        ">
          ${type === 'user' ? '👤' : type === 'task' ? '🐕' : '📍'}
        </div>
      `,
      className: '',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });
  },

  // Get current location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  },

  // Calculate distance between two points (in miles or km)
  calculateDistance(lat1, lng1, lat2, lng2, unit = 'miles') {
    if (lat1 === lat2 && lng1 === lng2) {
      return 0;
    }

    const radlat1 = (Math.PI * lat1) / 180;
    const radlat2 = (Math.PI * lat2) / 180;
    const theta = lng1 - lng2;
    const radtheta = (Math.PI * theta) / 180;

    let dist = Math.sin(radlat1) * Math.sin(radlat2) +
               Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515; // Miles

    if (unit === 'km') {
      dist = dist * 1.609344;
    }

    return Math.round(dist * 10) / 10;
  },

  // Get address from coordinates (reverse geocoding)
  async getAddressFromCoords(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        displayName: data.display_name,
        address: data.address,
        fullAddress: this.formatAddress(data.address)
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  },

  // Format address object into readable string
  formatAddress(address) {
    if (!address) return '';

    const parts = [];
    if (address.road) parts.push(address.road);
    if (address.neighbourhood) parts.push(address.neighbourhood);
    if (address.suburb) parts.push(address.suburb);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);

    return parts.join(', ');
  },

  // Get coordinates from address (forward geocoding)
  async getCoordsFromAddress(address) {
    return searchLocation(address);
  },

  // Create a bounding box for search radius
  createBoundingBox(centerLat, centerLng, radiusMiles) {
    const kmPerLat = 111.32;
    const kmPerLng = 111.32 * Math.cos(centerLat * Math.PI / 180);

    const radiusKm = radiusMiles * 1.60934;

    const latDelta = radiusKm / kmPerLat;
    const lngDelta = radiusKm / kmPerLng;

    return {
      north: centerLat + latDelta,
      south: centerLat - latDelta,
      east: centerLng + lngDelta,
      west: centerLng - lngDelta
    };
  },

  // Check if point is within bounds
  isPointInBounds(lat, lng, bounds) {
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  },

  // Create map bounds from points
  createBoundsFromPoints(points) {
    if (points.length === 0) {
      return null;
    }

    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;

    points.forEach(point => {
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
    });

    return [
      [minLat, minLng],
      [maxLat, maxLng]
    ];
  },

  // Generate random points for testing
  generateRandomPoints(centerLat, centerLng, count = 10, radiusKm = 5) {
    const points = [];
    const kmPerLat = 111.32;
    const kmPerLng = 111.32 * Math.cos(centerLat * Math.PI / 180);

    for (let i = 0; i < count; i++) {
      // Random angle and distance
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusKm;

      // Convert to lat/lng offsets
      const latOffset = distance / kmPerLat;
      const lngOffset = distance / kmPerLng;

      points.push({
        lat: centerLat + Math.sin(angle) * latOffset,
        lng: centerLng + Math.cos(angle) * lngOffset,
        id: i + 1,
        title: `Location ${i + 1}`,
        distance: this.calculateDistance(centerLat, centerLng,
          centerLat + Math.sin(angle) * latOffset,
          centerLng + Math.cos(angle) * lngOffset)
      });
    }

    return points;
  },

  // Get directions between two points
  async getDirections(startLat, startLng, endLat, endLng, travelMode = 'walking') {
    try {
      // Using OpenRouteService API (requires API key)
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/${travelMode}?api_key=${process.env.REACT_APP_ORS_API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`
      );

      if (!response.ok) {
        throw new Error('Failed to get directions');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return {
        distance: data.features[0].properties.segments[0].distance / 1000, // km
        duration: data.features[0].properties.segments[0].duration / 60, // minutes
        geometry: data.features[0].geometry,
        instructions: data.features[0].properties.segments[0].steps.map(step => ({
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration
        }))
      };

    } catch (error) {
      console.error('Directions error:', error);
      return null;
    }
  },

  // Calculate travel time
  async calculateTravelTime(startLat, startLng, endLat, endLng, travelMode = 'walking') {
    const directions = await this.getDirections(startLat, startLng, endLat, endLng, travelMode);

    if (!directions) {
      return null;
    }

    return {
      distance: directions.distance,
      duration: directions.duration,
      formattedDuration: this.formatDuration(directions.duration)
    };
  },

  // Format duration in minutes
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  },

  // Save location to localStorage
  saveLocation(location) {
    try {
      localStorage.setItem('lastKnownLocation', JSON.stringify(location));
      return true;
    } catch (error) {
      console.error('Failed to save location:', error);
      return false;
    }
  },

  // Load location from localStorage
  loadLocation() {
    try {
      const saved = localStorage.getItem('lastKnownLocation');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load location:', error);
      return null;
    }
  },

  // Clear saved location
  clearLocation() {
    localStorage.removeItem('lastKnownLocation');
  }
};

export const calculateFare = (distanceKm, timeMin) => {
  const baseFare = 1500;
  const perKm = 800;
  const perMin = 200;
  return Math.round(baseFare + (Number(distanceKm || 0) * perKm) + (Number(timeMin || 0) * perMin));
};

export const getRouteData = async (startCoords, endCoords) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=false`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok') {
      const distanceInMeters = Number(data.routes?.[0]?.distance || 0);
      const distanceInKm = Number((distanceInMeters / 1000).toFixed(2));
      const durationInMin = Math.round(Number(data.routes?.[0]?.duration || 0) / 60);
      const estimatedPrice = calculateFare(distanceInKm, durationInMin);

      return {
        distance: distanceInKm,
        price: estimatedPrice,
        duration: durationInMin
      };
    }
  } catch (error) {
    console.error('Error fetching OSRM data:', error);
    return null;
  }

  return null;
};

export const searchLocation = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });
  const data = await response.json();
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  }
  return null;
};

export default mapService;
