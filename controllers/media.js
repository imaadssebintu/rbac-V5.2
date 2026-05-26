import Gallery from '../models/gallery.js';
import { Op, fn, col, where } from 'sequelize';

const buildLocationFilter = (value) =>
  where(fn('LOWER', col('location_tag')), {
    [Op.like]: `%${String(value).toLowerCase()}%`
  });

/**
 * Get images by location with fallback to global images
 * @param {string} location - User's location (city/country)
 * @returns {Array} Array of image URLs
 */
const getImagesByLocation = async (location) => {
  try {
    // Default images to return if location has no results
    const defaultImages = [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/desert_p1gotj.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/limegreen_lpoe4g.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/desert_p1gotj.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038710/city_ebffuj.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038691/app2_dwv18h.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/beauty_zdjuuz.jpg'

    ];

    // Get backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    // Query for location-specific images
    let locationImages = await Gallery.findAll({
      where: {
        [Op.and]: [buildLocationFilter(location)],
        is_active: true
      },
      order: [['created_at', 'DESC']],
      limit: 8
    });

    // If no location-specific images found, try country-level matching
    if (locationImages.length === 0 && location) {
      // Extract country from location string (simple heuristic: last word or after comma)
      const locationParts = location.split(',').map(part => part.trim());
      if (locationParts.length > 1) {
        const country = locationParts[locationParts.length - 1];
        locationImages = await Gallery.findAll({
          where: {
            [Op.and]: [buildLocationFilter(country)],
            is_active: true
          },
          order: [['created_at', 'DESC']],
          limit: 8
        });
      }
    }

    // If still no images, get global images from database
    if (locationImages.length === 0) {
      locationImages = await Gallery.findAll({
        where: {
          location_tag: 'Global',
          is_active: true
        },
        order: [['created_at', 'DESC']],
        limit: 8
      });
    }

    // Process images to ensure proper URL formatting
    const processedImages = locationImages.map(img => {
      let imageUrl = img.image_url;

      // If it's a local path (starts with /uploads), prefix with backend URL
      if (imageUrl.startsWith('/uploads')) {
        imageUrl = `${backendUrl}${imageUrl}`;
      }
      // If it's a relative path (doesn't start with http or /), prefix with backend URL
      else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = `${backendUrl}/uploads/${imageUrl}`;
      }

      return imageUrl;
    });

    // If we still don't have enough images, supplement with default images
    if (processedImages.length < 7) {
      const additionalNeeded = 7 - processedImages.length;
      const additionalDefaults = defaultImages.slice(0, additionalNeeded);
      processedImages.push(...additionalDefaults);
    }

    return processedImages;
  } catch (error) {
    console.error('Error fetching images by location:', error);
    
    // Return default images on error
    return [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/beauty_zdjuuz.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038719/desert_p1gotj.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038710/city_ebffuj.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038691/app2_dwv18h.jpg',
      'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038711/beauty_zdjuuz.jpg'
      

    ];
  }
};

/**
 * Get trending images for a location
 * GET /api/media/trending?location=CityName
 */
export const getTrendingImages = async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location parameter is required'
      });
    }

    const images = await getImagesByLocation(location);

    res.status(200).json({
      success: true,
      data: images,
      location: location,
      count: images.length
    });
  } catch (error) {
    console.error('Error in getTrendingImages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending images',
      error: error.message
    });
  }
};

/**
 * Get all gallery images with optional filtering
 * GET /api/media?location=CityName&limit=10
 */
export const getGalleryImages = async (req, res) => {
  try {
    const { location, limit = 20, active = true } = req.query;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    const whereClause = { is_active: active === 'true' };

    if (location) {
      whereClause[Op.and] = [buildLocationFilter(location)];
    }

    const images = await Gallery.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    // Process images
    const processedImages = images.map(img => ({
      id: img.id,
      imageUrl: img.image_url.startsWith('/uploads') 
        ? `${backendUrl}${img.image_url}` 
        : img.image_url,
      locationTag: img.location_tag,
      description: img.description,
      isActive: img.is_active,
      createdAt: img.created_at
    }));

    res.status(200).json({
      success: true,
      data: processedImages,
      count: processedImages.length
    });
  } catch (error) {
    console.error('Error in getGalleryImages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery images',
      error: error.message
    });
  }
};

/**
 * Add a new image to the gallery (Admin only)
 * POST /api/media
 */
export const addGalleryImage = async (req, res) => {
  try {
    const { imageUrl, locationTag, description, isActive = true } = req.body;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    if (!imageUrl || !locationTag) {
      return res.status(400).json({
        success: false,
        message: 'Image URL and location tag are required'
      });
    }

    // Process image URL if it's a local path
    let processedImageUrl = imageUrl;
    if (imageUrl.startsWith('/uploads')) {
      processedImageUrl = `${backendUrl}${imageUrl}`;
    }

    const newImage = await Gallery.create({
      image_url: processedImageUrl,
      location_tag: locationTag,
      description: description || null,
      is_active: isActive
    });

    res.status(201).json({
      success: true,
      data: {
        id: newImage.id,
        imageUrl: newImage.image_url,
        locationTag: newImage.location_tag,
        description: newImage.description,
        isActive: newImage.is_active,
        createdAt: newImage.created_at
      },
      message: 'Image added to gallery successfully'
    });
  } catch (error) {
    console.error('Error in addGalleryImage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add image to gallery',
      error: error.message
    });
  }
};

/**
 * Update an existing gallery image (Admin only)
 * PUT /api/media/:id
 */
export const updateGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, locationTag, description, isActive } = req.body;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    const image = await Gallery.findByPk(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update fields
    if (imageUrl !== undefined) {
      let processedImageUrl = imageUrl;
      if (imageUrl.startsWith('/uploads')) {
        processedImageUrl = `${backendUrl}${imageUrl}`;
      }
      image.image_url = processedImageUrl;
    }

    if (locationTag !== undefined) {
      image.location_tag = locationTag;
    }

    if (description !== undefined) {
      image.description = description;
    }

    if (isActive !== undefined) {
      image.is_active = isActive;
    }

    await image.save();

    res.status(200).json({
      success: true,
      data: {
        id: image.id,
        imageUrl: image.image_url,
        locationTag: image.location_tag,
        description: image.description,
        isActive: image.is_active,
        updatedAt: image.updated_at
      },
      message: 'Image updated successfully'
    });
  } catch (error) {
    console.error('Error in updateGalleryImage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image',
      error: error.message
    });
  }
};

/**
 * Delete a gallery image (Admin only)
 * DELETE /api/media/:id
 */
export const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Gallery.findByPk(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    await image.destroy();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteGalleryImage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

export default {
  getImagesByLocation,
  getTrendingImages,
  getGalleryImages,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage
};