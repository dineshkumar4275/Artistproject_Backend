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

// ✅ Better signed URL generation with longer expiry
export const getSignedUrl = (publicId, expiresIn = 86400) => {
  try {
    if (!publicId) return '';
    
    // Generate signed URL with longer expiry (24 hours)
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
  } catch (error) {
    console.error('Error generating signed URL for:', publicId, error);
    return null;
  }
};

export default cloudinary;