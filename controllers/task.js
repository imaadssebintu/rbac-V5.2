import Task from '../models/task.js';
import User from '../models/user.js';
import Role from '../models/role.js';
import Payment from '../models/payment.js';
import Message from '../models/message.js';
import GuideTask from '../models/guideTask.js';
import * as geolib from 'geolib';
import { Op } from 'sequelize';

class TaskController {
    static getLatLngFromLocation(location) {
        if (!location || typeof location !== 'object') {
            return null;
        }

        const lat = Number(location.lat ?? location.latitude ?? location.coordinates?.lat ?? location.coordinates?.[1]);
        const lng = Number(location.lng ?? location.longitude ?? location.coordinates?.lng ?? location.coordinates?.[0]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        return { lat, lng };
    }

    static estimateEtaMinutes(distanceMeters, speedKmh = 30) {
        const distanceKm = Number(distanceMeters || 0) / 1000;
        if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
            return 0;
        }

        return Math.max(1, Math.ceil((distanceKm / Math.max(speedKmh, 1)) * 60));
    }

    static getTaskActionLogs(task) {
        return Array.isArray(task?.session_logs) ? task.session_logs : [];
    }

    static getMaxTaskLogEntries() {
        const configured = Number(process.env.TASK_LOG_MAX_ENTRIES || 200);
        return Number.isFinite(configured) && configured > 0 ? configured : 200;
    }

    static sanitizeLocation(rawLocation) {
        if (!rawLocation || typeof rawLocation !== 'object') {
            return null;
        }

        const lat = Number(rawLocation.lat ?? rawLocation.latitude);
        const lng = Number(rawLocation.lng ?? rawLocation.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        return {
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6))
        };
    }

    static truncateText(value, maxLength = 240) {
        const text = String(value || '');
        if (text.length <= maxLength) {
            return text;
        }
        return `${text.slice(0, maxLength)}...`;
    }

    static normalizeTaskLogEntry(entry = {}) {
        return {
            timestamp: entry.timestamp || new Date(),
            action: entry.action || undefined,
            note: entry.note ? TaskController.truncateText(entry.note, 220) : undefined,
            location: TaskController.sanitizeLocation(entry.location),
            distance_traveled: Number.isFinite(Number(entry.distance_traveled))
                ? Number(entry.distance_traveled)
                : undefined,
            completed_by: entry.completed_by || undefined,
            rating: Number.isFinite(Number(entry.rating)) ? Number(entry.rating) : undefined,
            complaint: typeof entry.complaint === 'boolean' ? entry.complaint : undefined,
            feedback: entry.feedback ? TaskController.truncateText(entry.feedback, 300) : undefined
        };
    }

    static appendTaskLogs(task, entries = []) {
        const normalizedEntries = (Array.isArray(entries) ? entries : [entries])
            .filter(Boolean)
            .map((entry) => TaskController.normalizeTaskLogEntry(entry));

        const existingLogs = TaskController.getTaskActionLogs(task);
        const maxEntries = TaskController.getMaxTaskLogEntries();

        return [...existingLogs, ...normalizedEntries].slice(-maxEntries);
    }

    static isTaskApproved(task) {
        return TaskController.getTaskActionLogs(task).some((entry) => entry?.action === 'admin_approved');
    }

    static async getTaskPayment(taskId, paymentTypes = ['task_payment']) {
        const types = Array.isArray(paymentTypes) && paymentTypes.length > 0
            ? paymentTypes
            : ['task_payment'];

        return Payment.findOne({
            where: { task_id: taskId, payment_type: types },
            order: [['createdAt', 'DESC']]
        });
    }

    static async notifyUser(req, receiverId, content, messageType = 'notification', metadata = {}) {
        if (!receiverId || !content) {
            return;
        }

        const senderId = req.user?.id || receiverId;
        const message = await Message.create({
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            message_type: messageType,
            metadata,
            is_read: false
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${receiverId}`).emit('new_message', {
                ...message.toJSON(),
                conversationId: String(senderId)
            });

            io.to(`user:${receiverId}`).emit('task_update', {
                taskId: metadata?.task_id || null,
                type: metadata?.event || 'task_update',
                content,
                metadata
            });
        }
    }

    static async notifyRole(req, roleName, content, messageType = 'system_alert', metadata = {}) {
        const io = req.app.get('io');
        if (!io || !roleName || !content) {
            return;
        }

        io.to(`role:${roleName}`).emit('task_update', {
            taskId: metadata?.task_id || null,
            type: metadata?.event || 'task_update',
            content,
            metadata
        });

        io.to(`role:${roleName}`).emit('system_notification', {
            title: metadata?.title || 'Trip Update',
            message: content,
            role: roleName,
            type: messageType,
            metadata,
            createdAt: new Date().toISOString()
        });
    }

    static async notifyAdmins(req, content, metadata = {}) {
        const adminRole = await Role.findOne({ where: { name: 'Admin' } });
        if (!adminRole) {
            return;
        }

        const admins = await User.findAll({ where: { role_id: adminRole.id, is_active: true }, attributes: ['id'] });
        await Promise.all(
            admins.map((admin) =>
                TaskController.notifyUser(req, admin.id, content, 'system_alert', metadata)
            )
        );
    }

    static resolveTaskId(req) {
        return req.params.task_id || req.params.id || req.body.task_id;
    }

    static normalizeRouteInput(location) {
        if (!location || typeof location !== 'object') {
            return null;
        }

        const address = String(location.address || location.label || location.name || '').trim();
        const lat = Number(location.lat ?? location.latitude);
        const lng = Number(location.lng ?? location.longitude);

        return {
            address: address || null,
            lat: Number.isFinite(lat) ? Number(lat) : null,
            lng: Number.isFinite(lng) ? Number(lng) : null
        };
    }

    static calculateFare(distanceKm, timeMin) {
        const baseFare = Number(process.env.TASK_BASE_FARE || 1500);
        const perKm = Number(process.env.TASK_PER_KM || 800);
        const perMin = Number(process.env.TASK_PER_MIN || 200);

        return Number((baseFare + (Number(distanceKm || 0) * perKm) + (Number(timeMin || 0) * perMin)).toFixed(0));
    }

    static getNominatimHeaders() {
        return {
            Accept: 'application/json',
            'User-Agent': process.env.OSM_USER_AGENT || 'VoyaApp/1.0 (support@voya.local)'
        };
    }

    static async geocodeAddressWithOSM(address) {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'json');
        url.searchParams.set('q', address);
        url.searchParams.set('limit', '1');

        const response = await fetch(url.toString(), {
            headers: TaskController.getNominatimHeaders()
        });

        if (!response.ok) {
            throw new Error('Unable to geocode address with OSM');
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Address not found: ${address}`);
        }

        return {
            lat: Number(parseFloat(data[0].lat).toFixed(6)),
            lng: Number(parseFloat(data[0].lon).toFixed(6)),
            address: data[0].display_name || address
        };
    }

    static async getRouteMetrics(pickupLocation, destinationLocation) {
        const pickup = await TaskController.geocodeLocation(pickupLocation);
        const destination = await TaskController.geocodeLocation(destinationLocation);

        if (!pickup || !destination) {
            throw new Error('pickup_location and destination must include an address or coordinates');
        }

        const url = new URL(
            `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`
        );
        url.searchParams.set('overview', 'false');

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error('Unable to reach OSRM routing API');
        }

        const data = await response.json();

        if (data?.code !== 'Ok' || !Array.isArray(data?.routes) || !data.routes[0]) {
            throw new Error('Unable to calculate route metrics');
        }

        const route = data.routes[0];
        const distanceMeters = Number(route.distance || 0);
        const durationSeconds = Number(route.duration || 0);
        const distanceKm = Number((distanceMeters / 1000).toFixed(2));
        const timeMin = Number((durationSeconds / 60).toFixed(0));

        return {
            distanceMeters,
            distanceKm,
            durationSeconds,
            timeMin,
            fare: TaskController.calculateFare(distanceKm, timeMin),
            originAddress: pickup.address || `${pickup.lat},${pickup.lng}`,
            destinationAddress: destination.address || `${destination.lat},${destination.lng}`
        };
    }

    static async geocodeLocation(location) {
        const normalized = TaskController.normalizeRouteInput(location);
        if (!normalized) {
            return null;
        }

        if (Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng)) {
            return {
                lat: Number(normalized.lat.toFixed(6)),
                lng: Number(normalized.lng.toFixed(6)),
                address: normalized.address
            };
        }

        if (normalized.address) {
            return TaskController.geocodeAddressWithOSM(normalized.address);
        }

        return null;
    }

    static async ensureTaskPaid(taskId) {
        const payment = await Payment.findOne({
            where: {
                task_id: taskId,
                status: 'completed',
                payment_type: 'task_payment'
            }
        });

        return Boolean(payment);
    }

    static async quoteTask(req, res, next) {
        try {
            const { pickup_location, destination } = req.body;

            if (!pickup_location || !destination) {
                return res.status(400).json({
                    success: false,
                    message: 'pickup_location and destination are required'
                });
            }

            let routeMetrics;
            try {
                routeMetrics = await TaskController.getRouteMetrics(pickup_location, destination);
            } catch (routeError) {
                const message = routeError?.message || 'Unable to calculate route metrics';
                return res.status(400).json({
                    success: false,
                    message
                });
            }

            res.json({
                success: true,
                quote: {
                    distance_km: routeMetrics.distanceKm,
                    duration_min: routeMetrics.timeMin,
                    fare_estimate: routeMetrics.fare,
                    currency: 'UGX',
                    origin_address: routeMetrics.originAddress,
                    destination_address: routeMetrics.destinationAddress
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async createTask(req, res, next) {
        try {
            const { walkee_id, description, pickup_location, destination, scheduled_time, price } = req.body;

            const walkee = await User.findByPk(walkee_id);
            if (!walkee) {
                return res.status(404).json({
                    success: false,
                    message: 'Walkee not found'
                });
            }

            let routeMetrics;
            let pickupCoordinates;
            let destinationCoordinates;
            try {
                routeMetrics = await TaskController.getRouteMetrics(pickup_location, destination);
                pickupCoordinates = await TaskController.geocodeLocation(pickup_location);
                destinationCoordinates = await TaskController.geocodeLocation(destination);
            } catch (routeError) {
                const message = routeError?.message || 'Unable to calculate route metrics';
                return res.status(400).json({
                    success: false,
                    message
                });
            }
            const finalPrice = Number(price) > 0 ? Number(price) : routeMetrics.fare;

            const task = await Task.create({
                walkee_id,
                description,
                pickup_location: {
                    ...pickup_location,
                    ...pickupCoordinates
                },
                destination: {
                    ...destination,
                    ...destinationCoordinates
                },
                estimated_distance: Number((routeMetrics.distanceKm * 1000).toFixed(0)),
                estimated_duration: routeMetrics.timeMin,
                price: finalPrice,
                scheduled_time: new Date(scheduled_time),
                status: 'pending'
            });

            // Find nearby walkers
            const nearbyWalkers = await TaskController.findNearbyWalkers(pickup_location);

            // Notify nearby walkers (would integrate with notification service)

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                task,
                quote: {
                    distance_km: routeMetrics.distanceKm,
                    duration_min: routeMetrics.timeMin,
                    fare_estimate: finalPrice,
                    currency: 'UGX'
                },
                nearbyWalkers: nearbyWalkers.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async findNearbyWalkers(location, radius = 5000) { // 5km radius
        try {
            const origin = TaskController.getLatLngFromLocation(location);
            if (!origin) {
                return [];
            }

            const walkers = await User.findAll({
                where: {
                    role_id: await this.getWalkerRoleId(),
                    is_active: true
                },
                attributes: ['id', 'name', 'location']
            });

            return walkers
                .map((walker) => {
                    const walkerLocation = TaskController.getLatLngFromLocation(walker.location);
                    if (!walkerLocation) {
                        return null;
                    }

                    const distanceMeters = geolib.getDistance(
                        { latitude: origin.lat, longitude: origin.lng },
                        { latitude: walkerLocation.lat, longitude: walkerLocation.lng }
                    );

                    if (distanceMeters > radius) {
                        return null;
                    }

                    return {
                        ...walker.toJSON(),
                        distance_meters: distanceMeters,
                        distance_km: Number((distanceMeters / 1000).toFixed(2))
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.distance_meters - b.distance_meters);
        } catch (error) {
            console.error('Error finding nearby walkers:', error);
            return [];
        }
    }

    static async getWalkerRoleId() {
        // Cache this in production
        const role = await Role.findOne({ where: { name: 'Walker' } });
        return role ? role.id : null;
    }

    static async assignTask(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const actorRole = String(req.user?.Role?.name || req.user?.role || '').toLowerCase();
            const requestedWalkerId = req.body.walker_id;
            const walker_id = requestedWalkerId || (actorRole === 'walker' ? req.user?.id : null);

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (['completed', 'cancelled'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Task is already ${task.status}`
                });
            }

            if (!walker_id) {
                return res.status(400).json({
                    success: false,
                    message: 'walker_id is required'
                });
            }

            if (!TaskController.isTaskApproved(task)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task must be approved by admin before guide assignment'
                });
            }

            if (!['pending', 'assigned'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task is not available for assignment'
                });
            }

            if (task.walker_id && String(task.walker_id) !== String(walker_id)) {
                return res.status(409).json({
                    success: false,
                    message: 'Task has already been claimed by another guide'
                });
            }

            if (task.status === 'assigned' && String(task.walker_id) === String(walker_id)) {
                return res.json({
                    success: true,
                    message: 'Task already assigned to this guide',
                    task
                });
            }

            const walker = await User.findByPk(walker_id);
            if (!walker) {
                return res.status(404).json({
                    success: false,
                    message: 'Walker not found'
                });
            }

            const [updatedRows] = await Task.update(
                {
                    walker_id,
                    status: 'assigned'
                },
                {
                    where: {
                        id: task.id,
                        [Op.or]: [
                            { walker_id: null, status: 'pending' },
                            { walker_id, status: 'assigned' }
                        ]
                    }
                }
            );

            if (!updatedRows) {
                return res.status(409).json({
                    success: false,
                    message: 'Task has already been claimed by another guide'
                });
            }

            await task.reload();

            await TaskController.notifyUser(
                req,
                task.walkee_id,
                'Your trip has been assigned to a guide. Track ETA on your dashboard.',
                'task_update',
                { task_id: task.id, event: 'guide_assigned' }
            );

            await TaskController.notifyUser(
                req,
                walker_id,
                'You have been assigned a new trip. Proceed to pickup point.',
                'task_update',
                { task_id: task.id, event: 'task_assigned' }
            );

            res.json({
                success: true,
                message: 'Task assigned successfully',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async startTask(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { walker_location } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (!['assigned', 'active'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task must be active and assigned before starting'
                });
            }

            const isPaid = await TaskController.ensureTaskPaid(task.id);
            if (!isPaid) {
                return res.status(400).json({
                    success: false,
                    message: 'Task payment is pending. Service can only start after payment confirmation.'
                });
            }

            // Verify walker is at pickup location (within 100m)
            const distanceToPickup = geolib.getDistance(
                { latitude: walker_location.lat, longitude: walker_location.lng },
                { latitude: task.pickup_location.lat, longitude: task.pickup_location.lng }
            );

            const maxStartDistanceMeters = Number(
                process.env.START_TASK_MAX_DISTANCE_METERS
                    || (process.env.NODE_ENV === 'production' ? 100 : 10000)
            );

            if (distanceToPickup > maxStartDistanceMeters) {
                return res.status(400).json({
                    success: false,
                    message: 'You must be at the pickup location to start the task'
                });
            }

            await task.update({
                status: 'in_progress',
                started_at: new Date(),
                session_logs: TaskController.appendTaskLogs(task, {
                    timestamp: new Date(),
                    action: 'started',
                    location: walker_location
                })
            });

            await TaskController.notifyUser(
                req,
                task.walkee_id,
                'Your guide is on the way now. Check the dashboard map for remaining time.',
                'task_update',
                { task_id: task.id, event: 'guide_en_route' }
            );

            res.json({
                success: true,
                message: 'Task started successfully',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateTaskLocation(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { location, distance } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (task.status !== 'in_progress') {
                return res.status(400).json({
                    success: false,
                    message: 'Task is not in progress'
                });
            }

            const sessionLogs = TaskController.appendTaskLogs(task, {
                timestamp: new Date(),
                action: 'location_update',
                location,
                distance_traveled: distance
            });

            const totalDistance = sessionLogs.reduce((sum, log) => {
                const leg = Number(log.distance_traveled || 0);
                return sum + (Number.isFinite(leg) ? leg : 0);
            }, 0);

            await task.update({
                actual_distance: totalDistance,
                session_logs: sessionLogs,
                current_location: location
            });

            // Calculate and broadcast ETA to traveler
            try {
                const guideLocation = await TaskController.geocodeLocation(location);
                const destination = task.destination;

                if (guideLocation && destination) {
                    const routeMetrics = await TaskController.getRouteMetrics(guideLocation, destination);
                    const eta = new Date(Date.now() + (routeMetrics.durationSeconds * 1000));

                    // Broadcast location and ETA to traveler
                    const io = req.app.get('io');
                    if (io) {
                        io.to(`user:${task.walkee_id}`).emit('guide_location_update', {
                            taskId: task.id,
                            guideLocation: {
                                lat: Number(guideLocation.lat),
                                lng: Number(guideLocation.lng),
                                timestamp: new Date().toISOString()
                            },
                            distanceRemaining: routeMetrics.distanceKm,
                            durationRemaining: routeMetrics.timeMin,
                            eta: eta.toISOString(),
                            message: `Guide arriving in approximately ${routeMetrics.timeMin} minutes`
                        });
                    }
                }
            } catch (etaError) {
                console.error('Error calculating ETA:', etaError);
                // Continue even if ETA calculation fails
            }

            res.json({
                success: true,
                message: 'Location updated',
                distance: totalDistance
            });
        } catch (error) {
            next(error);
        }
    }

    static async completeTask(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { walker_location, walkee_rating } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (!['assigned', 'in_progress'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task must be assigned or in progress before completion'
                });
            }

            const actorRole = req.user?.Role?.name || req.user?.role || '';
            const normalizedRole = String(actorRole).toLowerCase();

            if (normalizedRole === 'walker' && walker_location?.lat && walker_location?.lng && task.destination?.lat && task.destination?.lng) {
                const distanceToDestination = geolib.getDistance(
                    { latitude: walker_location.lat, longitude: walker_location.lng },
                    { latitude: task.destination.lat, longitude: task.destination.lng }
                );

                if (distanceToDestination > 50) {
                    return res.status(400).json({
                        success: false,
                        message: 'You must be at the destination to complete the task'
                    });
                }
            }

            const completedAt = new Date();
            const duration = Math.round((completedAt - task.started_at) / 60000); // minutes

            await task.update({
                status: 'completed',
                completed_at: completedAt,
                actual_duration: duration,
                walkee_rating: walkee_rating || null,
                session_logs: TaskController.appendTaskLogs(task, {
                    timestamp: completedAt,
                    action: 'completed',
                    location: walker_location || null,
                    completed_by: normalizedRole || 'system'
                })
            });

            await TaskController.notifyUser(
                req,
                task.walkee_id,
                'Trip completed. Please rate your experience and leave feedback.',
                'task_update',
                { task_id: task.id, event: 'trip_completed_feedback_required' }
            );

            await TaskController.notifyAdmins(
                req,
                `Trip ${task.id} completed. Traveler feedback is pending.`,
                { task_id: task.id, event: 'trip_completed' }
            );

            res.json({
                success: true,
                message: 'Task completed successfully',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async processTaskPayment(task) {
        try {
            // Deduct from walkee's wallet
            const walkee = await User.findByPk(task.walkee_id);
            if (walkee.wallet_balance >= task.price) {
                await walkee.decrement('wallet_balance', { by: task.price });

                // Create payment record
                await Payment.create({
                    user_id: task.walkee_id,
                    task_id: task.id,
                    amount: task.price,
                    currency: task.currency,
                    payment_method: 'wallet',
                    payment_type: 'task_payment',
                    status: 'completed',
                    metadata: { task_completed: true }
                });

                // Add to walker's wallet
                const walker = await User.findByPk(task.walker_id);
                await walker.increment('wallet_balance', { by: task.price });

                // Record walker's earnings
                await Payment.create({
                    user_id: task.walker_id,
                    task_id: task.id,
                    amount: task.price,
                    currency: task.currency,
                    payment_method: 'wallet',
                    payment_type: 'task_payment',
                    status: 'completed',
                    metadata: { earned_from_task: true }
                });
            }
        } catch (error) {
            console.error('Payment processing error:', error);
        }
    }

    static async getTasks(req, res, next) {
        try {
            const { status, page = 1, limit = 20 } = req.query;
            const queryUserId = req.query.user_id;
            const queryRole = req.query.role;
            const user_id = queryUserId || req.user?.id;
            const role = queryRole || req.user?.Role?.name;

            const offset = (page - 1) * limit;
            const where = {};

            if (user_id) {
                if (role === 'Walker') {
                    // Walker scope is applied later to include both claimed and available nearby tasks.
                } else if (role === 'Walkee') {
                    where.walkee_id = user_id;
                }
            }

            if (status) {
                where.status = status;
            }

            let scopedTaskIds = null;
            if (user_id && role === 'Walker') {
                const availableGuideTasks = await GuideTask.findAll({
                    where: {
                        guide_id: user_id,
                        status: 'available'
                    },
                    attributes: ['task_id']
                });
                scopedTaskIds = availableGuideTasks.map((record) => record.task_id);

                where[Op.or] = [
                    { walker_id: user_id },
                    {
                        walker_id: null,
                        status: 'pending',
                        ...(scopedTaskIds.length > 0 ? { id: { [Op.in]: scopedTaskIds } } : {})
                    }
                ];
            }

            const tasks = await Task.findAndCountAll({
                where,
                order: [['scheduled_time', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'Walkee',
                        attributes: ['id', 'name', 'phone']
                    },
                    {
                        model: User,
                        as: 'Walker',
                        attributes: ['id', 'name', 'phone']
                    }
                ]
            });

            const enrichedTasks = await Promise.all(
                tasks.rows.map(async (taskRecord) => {
                    const task = taskRecord.toJSON();
                    const transportRequirement = TaskController.getTaskActionLogs(task)
                        .find((entry) => entry?.action === 'transport_facilitation_required');
                    const approved = TaskController.isTaskApproved(task);
                    const paymentTypes = transportRequirement ? ['transport_facilitation'] : ['task_payment'];
                    const payment = await TaskController.getTaskPayment(task.id, paymentTypes);
                    let transportDetails = null;

                    if (transportRequirement?.feedback) {
                        try {
                            transportDetails = JSON.parse(transportRequirement.feedback);
                        } catch (error) {
                            transportDetails = null;
                        }
                    }

                    return {
                        ...task,
                        is_approved: approved,
                        payment_status: payment?.status || 'unpaid',
                        requires_payment: approved && payment?.status !== 'completed',
                        transport_facilitation_required: Boolean(transportRequirement),
                        transport_distance_km: transportDetails?.nearest_distance_km || null,
                        transport_eta_minutes: transportDetails?.transport_eta_minutes || null,
                        transport_fee: transportDetails?.transport_fee || null
                    };
                })
            );

            res.json({
                success: true,
                tasks: enrichedTasks,
                pagination: {
                    total: tasks.count,
                    page: parseInt(page),
                    pages: Math.ceil(tasks.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async cancelTask(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { reason } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (['completed', 'cancelled'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Task is already ${task.status}`
                });
            }

            await task.update({
                status: 'cancelled',
                notes: reason ? `${task.notes || ''}\nCancelled: ${reason}` : task.notes
            });

            await TaskController.notifyUser(
                req,
                task.walkee_id,
                'Your trip was cancelled by admin.',
                'task_update',
                { task_id: task.id, event: 'trip_cancelled', reason: reason || 'Cancelled by admin' }
            );

            if (task.walker_id) {
                await TaskController.notifyUser(
                    req,
                    task.walker_id,
                    'The trip you were assigned to was cancelled.',
                    'task_update',
                    { task_id: task.id, event: 'trip_cancelled' }
                );
            }

            await TaskController.notifyAdmins(
                req,
                `Trip ${task.id} was cancelled.`,
                { task_id: task.id, event: 'trip_cancelled' }
            );

            await TaskController.notifyRole(
                req,
                'Walker',
                `Trip ${task.id} was cancelled and is no longer available.`,
                'task_update',
                { task_id: task.id, event: 'trip_cancelled' }
            );

            res.json({
                success: true,
                message: 'Task cancelled successfully',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async approveTask(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { note } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            if (['completed', 'cancelled'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Task is already ${task.status}`
                });
            }

            if (TaskController.isTaskApproved(task)) {
                return res.status(400).json({
                    success: false,
                    message: 'Task is already approved'
                });
            }

            const pickupLocation = await TaskController.geocodeLocation(task.pickup_location);
            const nearbyWalkers = pickupLocation
                ? await TaskController.findNearbyWalkers(pickupLocation)
                : [];
            const nearestWalker = nearbyWalkers[0] || null;
            const nearestDistanceKm = nearestWalker?.distance_km ? Number(nearestWalker.distance_km) : null;
            const transportFacilitationRequired = Number.isFinite(nearestDistanceKm) && nearestDistanceKm > 1;
            const transportEtaMinutes = nearestWalker?.distance_meters
                ? TaskController.estimateEtaMinutes(nearestWalker.distance_meters, 30)
                : null;
            const transportFee = transportFacilitationRequired
                ? Number((Math.max(1, nearestDistanceKm) * 1200).toFixed(0))
                : 0;

            await task.update({
                status: 'pending',
                walker_id: null,
                notes: `${task.notes || ''}\nAdmin approved: ${note || 'Approved for guide assignment'}`.trim(),
                session_logs: TaskController.appendTaskLogs(task, [
                    {
                        timestamp: new Date(),
                        action: 'admin_approved',
                        note: note || 'Approved for guide assignment'
                    },
                    {
                        timestamp: new Date(),
                        action: 'activated_claimable',
                        note: 'Task activated by admin and claimable by available guides'
                    },
                    ...(transportFacilitationRequired ? [{
                        timestamp: new Date(),
                        action: 'transport_facilitation_required',
                        note: `Nearest guide is ${nearestDistanceKm.toFixed(2)} km away`,
                        feedback: JSON.stringify({
                            nearest_distance_km: nearestDistanceKm,
                            transport_eta_minutes: transportEtaMinutes,
                            transport_fee: transportFee
                        })
                    }] : [])
                ])
            });

            if (nearbyWalkers.length > 0) {
                await Promise.all(
                    nearbyWalkers.map((walker) =>
                        TaskController.notifyUser(
                            req,
                            walker.id,
                            transportFacilitationRequired
                                ? `Trip ${task.id} is claimable and about ${walker.distance_km} km away. Traveler transport support is enabled. ETA is about ${transportEtaMinutes} min.`
                                : `Trip ${task.id} is now active and claimable near your area. Claim it if available.`,
                            'task_update',
                            {
                                task_id: task.id,
                                event: transportFacilitationRequired ? 'transport_facilitation_required' : 'trip_approved_nearby',
                                nearest_distance_km: walker.distance_km,
                                transport_eta_minutes: transportEtaMinutes,
                                transport_fee: transportFee,
                                transport_facilitation_required: transportFacilitationRequired
                            }
                        )
                    )
                );
            } else {
                await TaskController.notifyRole(
                    req,
                    'Walker',
                    `Trip ${task.id} was approved by admin. It will become claimable after traveler payment.`,
                    'task_update',
                    { task_id: task.id, event: 'trip_approved' }
                );
            }

            await TaskController.notifyUser(
                req,
                task.walkee_id,
                transportFacilitationRequired
                    ? `Your trip was approved and activated by admin. The nearest guide is ${nearestDistanceKm.toFixed(2)} km away, ETA is about ${transportEtaMinutes} min, and guides can now claim the task.`
                    : 'Your trip was approved and activated by admin. Available guides can now claim your trip.',
                'payment_update',
                {
                    task_id: task.id,
                    event: transportFacilitationRequired ? 'transport_facilitation_required' : 'admin_approved_payment_required',
                    nearest_distance_km: nearestDistanceKm,
                    transport_eta_minutes: transportEtaMinutes,
                    transport_fee: transportFee,
                    transport_facilitation_required: transportFacilitationRequired
                }
            );

            await TaskController.notifyAdmins(
                req,
                `Trip ${task.id} approved and awaiting traveler payment.`,
                { task_id: task.id, event: 'trip_approved' }
            );

            res.json({
                success: true,
                message: 'Task approved successfully',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async getNearbyWalkers(req, res, next) {
        try {
            const { lat, lng, radius = 5000 } = req.query;

            if (!lat || !lng) {
                return res.status(400).json({
                    success: false,
                    message: 'lat and lng are required'
                });
            }

            const location = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };

            const walkers = await TaskController.findNearbyWalkers(location, parseInt(radius));

            res.json({
                success: true,
                walkers
            });
        } catch (error) {
            next(error);
        }
    }

    static async getTaskTracking(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            const now = new Date();
            let etaMinutes = null;
            let stage = 'waiting';

            if (task.status === 'in_progress' && task.started_at) {
                const elapsed = Math.max(0, Math.round((now - new Date(task.started_at)) / 60000));
                etaMinutes = Math.max(0, Number(task.estimated_duration || 0) - elapsed);
                stage = etaMinutes > 0 ? 'guide_en_route' : 'arriving';
            } else if (task.status === 'assigned') {
                const scheduled = new Date(task.scheduled_time);
                etaMinutes = Math.max(0, Math.round((scheduled - now) / 60000));
                stage = etaMinutes > 0 ? 'assigned_waiting_start' : 'ready_to_start';
            }

            return res.json({
                success: true,
                tracking: {
                    task_id: task.id,
                    status: task.status,
                    stage,
                    eta_minutes: etaMinutes
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async submitFeedback(req, res, next) {
        try {
            const task_id = TaskController.resolveTaskId(req);
            const { rating, feedback, complaint = false } = req.body;

            const task = await Task.findByPk(task_id);
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            if (String(task.walkee_id) !== String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'Only the traveler can submit trip feedback' });
            }

            if (task.status !== 'completed') {
                return res.status(400).json({ success: false, message: 'Feedback can only be submitted for completed trips' });
            }

            const numericRating = Number(rating);
            if (!numericRating || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
            }

            const feedbackText = String(feedback || '').trim();
            const isComplaint = Boolean(complaint);

            const nextNotes = [
                task.notes || '',
                `Traveler feedback (${new Date().toISOString()}): ${feedbackText || 'No written comment'}${isComplaint ? ' [COMPLAINT]' : ''}`
            ].filter(Boolean).join('\n');

            await task.update({
                walkee_rating: numericRating,
                notes: nextNotes,
                session_logs: TaskController.appendTaskLogs(task, {
                    timestamp: new Date(),
                    action: 'feedback_submitted',
                    rating: numericRating,
                    feedback: feedbackText,
                    complaint: isComplaint
                })
            });

            await TaskController.notifyAdmins(
                req,
                isComplaint
                    ? `Complaint submitted for trip ${task.id}. Please review traveler feedback.`
                    : `New traveler rating submitted for trip ${task.id}: ${numericRating}/5`,
                {
                    task_id: task.id,
                    event: isComplaint ? 'trip_complaint_submitted' : 'trip_feedback_submitted',
                    rating: numericRating,
                    complaint: isComplaint,
                    feedback: feedbackText
                }
            );

            if (isComplaint) {
                const io = req.app.get('io');
                if (io) {
                    io.to('role:admin').emit('complaint_submitted', {
                        taskId: task.id,
                        travelerId: task.walkee_id,
                        guideId: task.walker_id || null,
                        rating: numericRating,
                        feedback: feedbackText,
                        message: `Complaint submitted for trip ${task.id}`,
                        createdAt: new Date().toISOString()
                    });
                }
            }

            if (task.walker_id) {
                await TaskController.notifyUser(
                    req,
                    task.walker_id,
                    `Traveler feedback received: ${numericRating}/5${isComplaint ? ' (complaint raised)' : ''}.`,
                    'task_update',
                    { task_id: task.id, event: 'traveler_feedback_shared', complaint: isComplaint }
                );
            }

            return res.json({
                success: true,
                message: isComplaint
                    ? 'Feedback submitted and complaint forwarded to admin'
                    : 'Feedback submitted and shared with admin',
                task
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteTask(req, res, next) {
        try {
            const { id } = req.params;

            const task = await Task.findByPk(id);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            await task.destroy();

            res.json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

export default TaskController;
