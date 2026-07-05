// backend/routes/images.js
import express from 'express';
import pool, { ensureTables } from '../config/db.js';
import cloudinary, { getSignedUrl } from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || 'my-super-secret-upload-key-2026-xyz789';

// =======================
// RUN TABLE CHECK ON STARTUP
// =======================
ensureTables();

// =======================
// GET ALL GALLERY IMAGES
// =======================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'gallery' OR type IS NULL ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      url: getSignedUrl(row.cloudinary_id),
      imageUrl: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'gallery',
      is_featured: row.is_featured,
      created_at: row.created_at,
      createdAt: row.created_at
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch images' });
  }
});

// =======================
// GET ALL PHOTOGRAPHY IMAGES
// =======================
router.get('/photography', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'photography' ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      url: getSignedUrl(row.cloudinary_id),
      imageUrl: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'photography',
      is_featured: row.is_featured,
      created_at: row.created_at,
      createdAt: row.created_at
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Error fetching photography images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch photography images' });
  }
});

// =======================
// GET ALL IMAGES (Combined)
// =======================
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM images ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      url: getSignedUrl(row.cloudinary_id),
      imageUrl: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'gallery',
      is_featured: row.is_featured,
      created_at: row.created_at,
      createdAt: row.created_at
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Error fetching all images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch images' });
  }
});

// =======================
// GET SINGLE IMAGE
// =======================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM images WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      title: row.title,
      description: row.description,
      url: getSignedUrl(row.cloudinary_id),
      imageUrl: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'gallery',
      is_featured: row.is_featured,
      created_at: row.created_at,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch image' });
  }
});

// =======================
// UPLOAD GALLERY IMAGE FILE
// =======================
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description, isFeatured } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'gallery',
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

    // Save to database
    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, image_url, type, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      title, 
      description || '', 
      result.public_id, 
      result.secure_url, 
      result.secure_url, 
      'gallery',
      isFeatured === 'true'
    ];
    const dbResult = await pool.query(query, values);

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description,
      url: getSignedUrl(image.cloudinary_id),
      imageUrl: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

// =======================
// UPLOAD GALLERY IMAGE BY URL
// =======================
router.post('/url', async (req, res) => {
  console.log('🔄 POST /url called');
  
  try {
    const { imageUrl, title, description, isFeatured, secret } = req.body;
    
    // Verify secret
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
      type: 'private',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    // Save to database
    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, image_url, type, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      title, 
      description || '', 
      result.public_id, 
      result.secure_url, 
      result.secure_url, 
      'gallery',
      isFeatured === 'true'
    ];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description,
      url: getSignedUrl(image.cloudinary_id),
      imageUrl: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured,
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
// UPLOAD PHOTOGRAPHY IMAGE
// =======================
router.post('/photography', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Photography upload started');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description, isFeatured } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Check if JPEG (or accept all for now)
    const isJpeg = req.file.mimetype.includes('jpeg') || req.file.mimetype.includes('jpg');
    if (!isJpeg) {
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
            { width: 1600, height: 1200, crop: 'fill', quality: 'auto' }
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
      INSERT INTO images (title, description, cloudinary_id, url, image_url, type, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      title, 
      description || '', 
      result.public_id, 
      result.secure_url, 
      result.secure_url, 
      'photography',
      isFeatured === 'true'
    ];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description,
      url: getSignedUrl(image.cloudinary_id),
      imageUrl: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'photography',
      is_featured: image.is_featured,
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
// UPDATE IMAGE
// =======================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isFeatured } = req.body;

    const result = await pool.query(
      `UPDATE images 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           is_featured = COALESCE($3, is_featured),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, description, isFeatured === 'true', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    const image = result.rows[0];
    res.json({
      id: image.id,
      title: image.title,
      description: image.description,
      url: getSignedUrl(image.cloudinary_id),
      imageUrl: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update image' });
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
    console.error('Delete error:', error);
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
    console.error('Delete all error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all images' });
  }
});

export default router;