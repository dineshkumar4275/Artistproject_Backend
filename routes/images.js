// backend/routes/images.js
import express from 'express';
import pool, { ensureTables } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || 'my-super-secret-upload-key-2026-xyz789';

// Ensure tables exist on startup
ensureTables();

// =======================
// GET ALL GALLERY IMAGES
// =======================
router.get('/', async (req, res) => {
  try {
    console.log('📸 Fetching gallery images...');
    
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'gallery' OR type IS NULL ORDER BY created_at DESC"
    );
    
    console.log(`✅ Found ${result.rows.length} gallery images`);
    
    const images = result.rows.map(row => {
      let signedUrl = '';
      try {
        signedUrl = cloudinary.utils.private_download_url(
          row.cloudinary_id,
          'jpg',
          { expires_at: Math.floor(Date.now() / 1000) + 3600 }
        );
      } catch (e) {
        console.error('Error generating signed URL for:', row.cloudinary_id);
        signedUrl = row.url || '';
      }
      
      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        url: signedUrl || row.url,
        imageUrl: signedUrl || row.url,
        cloudinary_id: row.cloudinary_id,
        type: row.type || 'gallery',
        is_featured: row.is_featured || false,
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('❌ Error fetching gallery images:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch images',
      details: error.message 
    });
  }
});

// =======================
// GET ALL PHOTOGRAPHY IMAGES
// =======================
router.get('/photography', async (req, res) => {
  try {
    console.log('📸 Fetching photography images...');
    
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'photography' ORDER BY created_at DESC"
    );
    
    console.log(`✅ Found ${result.rows.length} photography images`);
    
    const images = result.rows.map(row => {
      let signedUrl = '';
      try {
        signedUrl = cloudinary.utils.private_download_url(
          row.cloudinary_id,
          'jpg',
          { expires_at: Math.floor(Date.now() / 1000) + 3600 }
        );
      } catch (e) {
        console.error('Error generating signed URL for:', row.cloudinary_id);
        signedUrl = row.url || '';
      }
      
      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        url: signedUrl || row.url,
        imageUrl: signedUrl || row.url,
        cloudinary_id: row.cloudinary_id,
        type: row.type || 'photography',
        is_featured: row.is_featured || false,
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('❌ Error fetching photography images:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch photography images',
      details: error.message 
    });
  }
});

// =======================
// UPLOAD GALLERY IMAGE FILE
// =======================
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 Gallery file upload started');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    console.log('📤 Uploading to Cloudinary...');
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'Gallery',
          resource_type: 'auto',
          type: 'private',
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

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, description || '', result.public_id, result.secure_url, 'gallery'];
    const dbResult = await pool.query(query, values);

    const image = dbResult.rows[0];
    
    let signedUrl = '';
    try {
      signedUrl = cloudinary.utils.private_download_url(
        image.cloudinary_id,
        'jpg',
        { expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
    } catch (e) {
      signedUrl = image.url || '';
    }

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: signedUrl || image.url,
      imageUrl: signedUrl || image.url,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured || false,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// =======================
// UPLOAD GALLERY IMAGE BY URL
// =======================
router.post('/url', async (req, res) => {
  console.log('🔄 POST /url called');
  
  try {
    const { imageUrl, title, description, secret } = req.body;
    
    console.log('🔑 Secret received:', secret ? 'Yes' : 'No');
    console.log('🔑 Expected secret:', UPLOAD_SECRET);
    
    if (!secret || secret !== UPLOAD_SECRET) {
      console.log('❌ Invalid secret');
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
      folder: 'Gallery',
      resource_type: 'auto',
      type: 'private',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, description || '', result.public_id, result.secure_url, 'gallery'];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const image = dbResult.rows[0];
    
    let signedUrl = '';
    try {
      signedUrl = cloudinary.utils.private_download_url(
        image.cloudinary_id,
        'jpg',
        { expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
    } catch (e) {
      signedUrl = image.url || '';
    }

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: signedUrl || image.url,
      imageUrl: signedUrl || image.url,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured || false,
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

// =======================
// UPLOAD PHOTOGRAPHY IMAGE - JPEG ONLY
// =======================
router.post('/photography', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Photography upload started');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Check if JPEG
    if (!req.file.mimetype.includes('jpeg') && !req.file.mimetype.includes('jpg')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only JPEG/JPG images are allowed for photography' 
      });
    }

    console.log('📤 Uploading to Cloudinary...');
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'photography',
          resource_type: 'auto',
          type: 'private',
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

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, description || '', result.public_id, result.secure_url, 'photography'];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const image = dbResult.rows[0];
    
    let signedUrl = '';
    try {
      signedUrl = cloudinary.utils.private_download_url(
        image.cloudinary_id,
        'jpg',
        { expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
    } catch (e) {
      signedUrl = image.url || '';
    }

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: signedUrl || image.url,
      imageUrl: signedUrl || image.url,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'photography',
      is_featured: image.is_featured || false,
      created_at: image.created_at,
      createdAt: image.created_at
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload photography image',
      details: error.message 
    });
  }
});

// =======================
// DELETE IMAGE
// =======================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const imageQuery = await pool.query('SELECT * FROM images WHERE id = $1', [id]);
    
    if (imageQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const image = imageQuery.rows[0];

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.cloudinary_id);
    
    // Delete from database
    await pool.query('DELETE FROM images WHERE id = $1', [id]);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

// =======================
// DELETE ALL IMAGES
// =======================
router.delete('/', async (req, res) => {
  try {
    const images = await pool.query('SELECT * FROM images');

    for (const image of images.rows) {
      await cloudinary.uploader.destroy(image.cloudinary_id);
    }

    await pool.query('DELETE FROM images');

    res.json({ success: true, message: 'All images deleted successfully' });
  } catch (error) {
    console.error('❌ Delete all error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all images' });
  }
});

export default router;