import express from 'express';
import MediaController from '../controllers/media.js';

const router = express.Router();

/**
 * @route   GET /api/media/trending
 * @desc    Get trending images for a specific location
 * @access  Public
 * @query   location - City or country name
 */
router.get('/trending', MediaController.getTrendingImages);

/**
 * @route   GET /api/media
 * @desc    Get all gallery images with optional filtering
 * @access  Public
 * @query   location - Filter by location tag
 * @query   limit - Number of images to return (default: 20)
 * @query   active - Filter by active status (true/false)
 */
router.get('/', MediaController.getGalleryImages);

/**
 * @route   POST /api/media
 * @desc    Add a new image to the gallery (Admin only)
 * @access  Private (Admin)
 * @body    imageUrl - URL of the image
 * @body    locationTag - Location tag for the image
 * @body    description - Optional description
 * @body    isActive - Whether the image is active (default: true)
 */
router.post('/', MediaController.addGalleryImage);

/**
 * @route   PUT /api/media/:id
 * @desc    Update an existing gallery image (Admin only)
 * @access  Private (Admin)
 * @param   id - Image ID
 * @body    imageUrl - New image URL
 * @body    locationTag - New location tag
 * @body    description - New description
 * @body    isActive - New active status
 */
router.put('/:id', MediaController.updateGalleryImage);

/**
 * @route   DELETE /api/media/:id
 * @desc    Delete a gallery image (Admin only)
 * @access  Private (Admin)
 * @param   id - Image ID
 */
router.delete('/:id', MediaController.deleteGalleryImage);

export default router;