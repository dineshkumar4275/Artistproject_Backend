// // backend/config/cloudinary.js
// import { v2 as cloudinary } from 'cloudinary';
// import dotenv from 'dotenv';

// dotenv.config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// console.log('✅ Cloudinary configured successfully');

// // Helper to generate signed URL
// export const getSignedUrl = (publicId, expiresIn = 3600) => {
//   try {
//     return cloudinary.utils.private_download_url(
//       publicId,
//       'jpg',
//       { expires_at: Math.floor(Date.now() / 1000) + expiresIn }
//     );
//   } catch (error) {
//     console.error('Error generating signed URL:', error);
//     return null;
//   }
// };

// export default cloudinary;
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

// ✅ Helper to generate optimized signed URL
export const getSignedUrl = (publicId, expiresIn = 3600, width = 800) => {
  try {
    // Use f_auto for format optimization and q_auto for quality
    const url = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: width, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
      ],
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

export default cloudinary;