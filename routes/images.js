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
      description: row.description || '',
      url: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'gallery',
      is_featured: row.is_featured || false,
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
// | GET ALL PHOTOGRAPHY IMAGES 
// =======================
router.get('/photography', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'photography' ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      url: getSignedUrl(row.cloudinary_id),
      cloudinary_id: row.cloudinary_id,
      type: row.type || 'photography',
      is_featured: row.is_featured || false,
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
// UPLOAD PHOTOGRAPHY IMAGE - FIXED VERSION
// =======================
router.post('/photography', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Photography upload started');
    console.log('📝 Body:', req.body);
    console.log('📎 File:', req.file ? req.file.originalname : 'NO FILE');
    
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
    }

    const { title, description, isFeatured } = req.body;
    
    // Check title
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
    }

    // Check if JPEG
    const isJpeg = req.file.mimetype.includes('jpeg') || req.file.mimetype.includes('jpg');
    if (!isJpeg) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only JPEG/JPG images are allowed for photography' 
      });
    }

    console.log('📤 Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await new Promise((resolve, reject) => {
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
            if (error) {
              console.error('Cloudinary error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        uploadStream.end(dataURI);
      });
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload failed:', cloudinaryError);
      return res.status(500).json({ 
        success: false, 
        error: 'Cloudinary upload failed',
        details: cloudinaryError.message 
      });
    }

    console.log('✅ Cloudinary upload successful:', cloudinaryResult.public_id);

    // Get actual column names from database
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images'
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('📊 Existing columns in database:', existingColumns);

    // Build dynamic INSERT query based on existing columns
    let columns = ['title', 'cloudinary_id', 'url', 'type'];
    let values = [
      title.trim(), 
      cloudinaryResult.public_id, 
      cloudinaryResult.secure_url, 
      'photography'
    ];
    let paramIndex = 4;

    // Add description if column exists
    if (existingColumns.includes('description')) {
      columns.push('description');
      values.push(description || '');
      paramIndex++;
    }

    // Add is_featured if column exists
    if (existingColumns.includes('is_featured')) {
      columns.push('is_featured');
      values.push(isFeatured === 'true' || false);
      paramIndex++;
    }

    // DO NOT add image_url - we want to avoid this error

    // Build the query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO images (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    console.log('📝 Insert Query:', query);
    console.log('📝 Values:', values);

    // Save to database
    let dbResult;
    try {
      dbResult = await pool.query(query, values);
    } catch (dbError) {
      console.error('❌ Database insert failed:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database insert failed',
        details: dbError.message 
      });
    }
    
    const image = dbResult.rows[0];
    console.log('✅ Database save successful:', image.id);

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'photography',
      is_featured: image.is_featured || false,
      created_at: image.created_at,
      createdAt: image.created_at
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload photography image',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// =======================
// | UPLOAD GALLERY IMAGE FILE
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

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      title, 
      description || '', 
      result.public_id, 
      result.secure_url, 
      'gallery',
      isFeatured === 'true' || false
    ];
    
    const dbResult = await pool.query(query, values);
    const image = dbResult.rows[0];

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: getSignedUrl(image.cloudinary_id),
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
      is_featured: image.is_featured || false,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image', details: error.message });
  }
});

// =======================
// | UPLOAD GALLERY IMAGE BY URL
// =======================
router.post('/url', async (req, res) => {
  console.log('🔄 POST /url called');
  
  try {
    const { imageUrl, title, description, isFeatured, secret } = req.body;
    
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

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      title, 
      description || '', 
      result.public_id, 
      result.secure_url, 
      'gallery',
      isFeatured === 'true' || false
    ];
    
    const dbResult = await pool.query(query, values);
    const image = dbResult.rows[0];
    
    console.log('✅ Database save successful');

    res.status(201).json({
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: getSignedUrl(image.cloudinary_id),
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
// | DELETE IMAGE
// =======================
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

// =======================
// | DELETE ALL IMAGES
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