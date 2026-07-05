import express from 'express';
import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || 'my-super-secret-upload-key-2026-xyz789';

// GET all images - Returns PRIVATE signed URLs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM images ORDER BY created_at DESC');
    
    const images = result.rows.map(row => {
      // Generate a signed URL that expires in 1 hour
      const signedUrl = cloudinary.utils.private_download_url(
        row.cloudinary_id,
        'jpg', // or get from row
        { expires_at: Math.floor(Date.now() / 1000) + 3600 } // 1 hour expiry
      );
      
      return {
        id: row.id,
        title: row.title,
        url: signedUrl, // Private signed URL
        imageUrl: signedUrl, // Private signed URL
        cloudinary_id: row.cloudinary_id,
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch images' });
  }
});

// POST upload image file - Upload as PRIVATE
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'gallery',
          resource_type: 'auto',
          type: 'private', // 🔒 Make it private!
          transformation: [
            { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        }
      );
      
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      uploadStream.end(dataURI);
    });

    const query = `
      INSERT INTO images (title, cloudinary_id, url, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url];
    const dbResult = await pool.query(query, values);

    // Generate signed URL for response
    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
    );

    const image = dbResult.rows[0];
    res.status(201).json({
      success: true,
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// 🔒 POST upload image by URL - Upload as PRIVATE
router.post('/url', async (req, res) => {
  console.log('🔄 POST /url called');
  
  try {
    const { imageUrl, title, secret } = req.body;
    
    if (!secret || secret !== UPLOAD_SECRET) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized: Invalid secret key' 
      });
    }
    
    if (!imageUrl || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image URL and title are required' 
      });
    }

    console.log('📤 Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'gallery',
      resource_type: 'auto',
      type: 'private', // 🔒 Make it private!
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, cloudinary_id, url, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    // Generate signed URL for response
    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
    );

    const image = dbResult.rows[0];
    res.status(201).json({
      success: true,
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload image from URL',
      details: error.message 
    });
  }
});

// DELETE image
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const imageQuery = await pool.query('SELECT * FROM images WHERE id = $1', [id]);
    
    if (imageQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const image = imageQuery.rows[0];

    await cloudinary.uploader.destroy(image.cloudinary_id);
    await pool.query('DELETE FROM images WHERE id = $1', [id]);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

// DELETE all images
router.delete('/', async (req, res) => {
  try {
    const images = await pool.query('SELECT * FROM images');

    for (const image of images.rows) {
      await cloudinary.uploader.destroy(image.cloudinary_id);
    }

    await pool.query('DELETE FROM images');

    res.json({ success: true, message: 'All images deleted successfully' });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all images' });
  }
});

export default router;