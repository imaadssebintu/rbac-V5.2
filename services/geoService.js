import geolib from 'geolib';
import { Op } from 'sequelize';
import User from '../models/user.js';
import Task from '../models/task.js';

class GeoService {
    static calculateDistance(pointA, pointB) {
        return geolib.getDistance(
            { latitude: pointA.lat, longitude: pointA.lng },
            { latitude: pointB.lat, longitude: pointB.lng }
        );
    }

    static async findNearbyWalkers(location, radius = 5000, limit = 10) {
        try {
            const Role = await import('../models/role.js');
            const walkerRole = await Role.default.findOne({ where: { name: 'Walker' } });

            if (!walkerRole) {
                return [];
            }

            const allWalkers = await User.findAll({
                where: {
                    role_id: walkerRole.id,
                    is_active: true,
                    location: {
                        [Op.ne]: null
                    }
                },
                attributes: ['id', 'name', 'profile_image', 'location', 'wallet_balance']
            });

            // Filter walkers within radius
            const nearbyWalkers = allWalkers.filter(walker => {
                if (!walker.location || !walker.location.coordinates) return false;

                const distance = this.calculateDistance(
                    location,
                    walker.location.coordinates
                );

                return distance <= radius;
            }).map(walker => {
                const distance = this.calculateDistance(
                    location,
                    walker.location.coordinates
                );

                return {
                    ...walker.getSafeData(),
                    distance: distance,
                    distance_km: (distance / 1000).toFixed(2)
                };
            });

            // Sort by distance
            return nearbyWalkers.sort((a, b) => a.distance - b.distance).slice(0, limit);
        } catch (error) {
            console.error('Error finding nearby walkers:', error);
            return [];
        }
    }

    static async findAvailableWalkers(location, taskId) {
        try {
            // Get walkers who are not currently on a task
            const activeTasks = await Task.findAll({
                where: {
                    status: ['assigned', 'in_progress'],
                    walker_id: { [Op.ne]: null }
                },
                attributes: ['walker_id']
            });

            const busyWalkerIds = activeTasks.map(task => task.walker_id);

            const nearbyWalkers = await this.findNearbyWalkers(location, 3000, 20);

            // Filter out busy walkers
            return nearbyWalkers.filter(walker =>
                !busyWalkerIds.includes(walker.id)
            );
        } catch (error) {
            console.error('Error finding available walkers:', error);
            return [];
        }
    }

    static calculateRoute(points) {
        if (!points || points.length < 2) {
            return { distance: 0, duration: 0 };
        }

        let totalDistance = 0;

        for (let i = 1; i < points.length; i++) {
            totalDistance += this.calculateDistance(points[i-1], points[i]);
        }

        // Estimate duration (walking speed: 5 km/h)
        const durationMinutes = Math.ceil((totalDistance / 5000) * 60);

        return {
            distance: totalDistance,
            distance_km: (totalDistance / 1000).toFixed(2),
            duration: durationMinutes,
            points: points
        };
    }

    static getBoundingBox(center, radius) {
        // Convert radius from meters to degrees (approximate)
        const latDiff = radius / 111320; // 1 degree latitude ≈ 111.32 km
        const lngDiff = radius / (111320 * Math.cos(center.lat * Math.PI / 180));

        return {
            north: center.lat + latDiff,
            south: center.lat - latDiff,
            east: center.lng + lngDiff,
            west: center.lng - lngDiff
        };
    }

    static async getWalkersInArea(boundingBox) {
        try {
            const Role = await import('../models/role.js');
            const walkerRole = await Role.default.findOne({ where: { name: 'Walker' } });

            if (!walkerRole) {
                return [];
            }

            // This is a simplified query. In production, use PostGIS or similar
            const walkers = await User.findAll({
                where: {
                    role_id: walkerRole.id,
                    is_active: true
                },
                attributes: ['id', 'name', 'location']
            });

            return walkers.filter(walker => {
                if (!walker.location || !walker.location.coordinates) return false;

                const lat = walker.location.coordinates.lat;
                const lng = walker.location.coordinates.lng;

                return (
                    lat >= boundingBox.south &&
                    lat <= boundingBox.north &&
                    lng >= boundingBox.west &&
                    lng <= boundingBox.east
                );
            });
        } catch (error) {
            console.error('Error getting walkers in area:', error);
            return [];
        }
    }
}

export default GeoService;
