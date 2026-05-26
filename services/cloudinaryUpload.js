import cloudinary from './cloudinaryConfig.js';

export const uploadImage = async (filePath, options = {}) => {
    const uploadOptions = {
        folder: 'voya_profiles',
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
        ...options
    };

    try {
        const result = await cloudinary.uploader.upload(filePath, uploadOptions);
        console.log('Image URL:', result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};

export default uploadImage;