// backend/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('✅ Cloudinary configured successfully');

export const getSignedUrl = (publicId, expiresIn = 86400) => {
  try {
    if (!publicId) return '';
    
    // Check if it's a private image (starts with 'private/')
    if (publicId.includes('private')) {
      // Generate signed URL for private images
      const url = cloudinary.utils.private_download_url(
        publicId,
        'jpg',
        { 
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          secure: true,
          sign_url: true
        }
      );
      return url;
    }
    
    // For public images, just use the URL
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
  } catch (error) {
    console.error('Error generating URL for:', publicId, error);
    return '';
  }
};

export default cloudinary;