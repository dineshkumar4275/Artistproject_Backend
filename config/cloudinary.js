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

export const getImageUrl = (publicId) => {
  try {
    if (!publicId) return '';
    
    // ✅ Simply return the public URL - no signing needed
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
  } catch (error) {
    console.error('Error generating URL for:', publicId, error);
    return '';
  }
};

export default cloudinary;