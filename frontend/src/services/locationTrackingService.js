import { taskAPI } from './api.js';

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.currentTaskId = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 5000; // Update every 5 seconds
    this.listeners = [];
  }

  // Subscribe to location updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners of location update
  notifyListeners(location) {
    this.listeners.forEach(cb => cb(location));
  }

  // Start tracking guide location
  startTracking(taskId) {
    if (this.isTracking && this.currentTaskId === taskId) {
      return; // Already tracking this task
    }

    this.currentTaskId = taskId;
    this.isTracking = true;
    this.lastUpdateTime = 0;

    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position, taskId),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      console.log('Location tracking started for task:', taskId);
    } else {
      console.error('Geolocation not supported');
    }
  }

  // Stop tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.currentTaskId = null;
    console.log('Location tracking stopped');
  }

  // Handle location update
  async handleLocationUpdate(position, taskId) {
    const now = Date.now();
    
    // Throttle updates to avoid overwhelming the backend
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };

    this.lastUpdateTime = now;

    try {
      // Send location update to backend
      await taskAPI.updateLocation(taskId, location);
      this.notifyListeners(location);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  // Handle location error
  handleLocationError(error) {
    console.error('Geolocation error:', error);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('Location permission denied');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location unavailable');
        break;
      case error.TIMEOUT:
        console.error('Location request timeout');
        break;
      default:
        console.error('Unknown geolocation error');
    }
  }

  // Get current tracking status
  isTrackingTask(taskId) {
    return this.isTracking && this.currentTaskId === taskId;
  }

  // Get current task being tracked
  getCurrentTask() {
    return this.currentTaskId;
  }
}

export default new LocationTrackingService();
