import express from 'express';
import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || 'my-super-secret-upload-key-2026-xyz789';

// =======================
// CHECK AND FIX TABLE SCHEMA
// =======================
const ensureTypeColumn = async () => {
  try {
    // Check if type column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'type'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('⚠️ Type column missing, adding it...');
      await pool.query(`
        ALTER TABLE images 
        ADD COLUMN type VARCHAR(50) DEFAULT 'gallery' 
        CHECK (type IN ('gallery', 'photography'))
      `);
      await pool.query(`UPDATE images SET type = 'gallery' WHERE type IS NULL`);
      console.log('✅ Type column added successfully');
    } else {
      console.log('✅ Type column exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring type column:', error);
  }
};

// Run on startup
ensureTypeColumn();

// =======================
// GET ALL GALLERY IMAGES
// =======================
router.get('/', async (req, res) => {
  try {
    // Ensure type column exists
    await ensureTypeColumn();
    
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'gallery' OR type IS NULL ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => {
      const signedUrl = cloudinary.utils.private_download_url(
        row.cloudinary_id,
        'jpg',
        { expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
      
      return {
        id: row.id,
        title: row.title,
        url: signedUrl,
        imageUrl: signedUrl,
        cloudinary_id: row.cloudinary_id,
        type: row.type || 'gallery',
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
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
    // Ensure type column exists
    await ensureTypeColumn();
    
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'photography' ORDER BY created_at DESC"
    );
    
    const images = result.rows.map(row => {
      const signedUrl = cloudinary.utils.private_download_url(
        row.cloudinary_id,
        'jpg',
        { expires_at: Math.floor(Date.now() / 1000) + 3600 }
      );
      
      return {
        id: row.id,
        title: row.title,
        url: signedUrl,
        imageUrl: signedUrl,
        cloudinary_id: row.cloudinary_id,
        type: row.type || 'photography',
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('Error fetching photography images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch photography images' });
  }
});

// =======================
// UPLOAD GALLERY IMAGE FILE
// =======================
router.post('/', upload.single('image'), async (req, res) => {
  try {
    await ensureTypeColumn();
    
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
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, 'gallery'];
    const dbResult = await pool.query(query, values);

    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
    );

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
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
    await ensureTypeColumn();
    
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
      type: 'private',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, 'gallery'];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
    );

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'gallery',
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
    await ensureTypeColumn();
    
    console.log('📸 Photography upload started');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title } = req.body;
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
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, 'photography'];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
    );

    const image = dbResult.rows[0];
    res.status(201).json({
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'photography',
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

    await cloudinary.uploader.destroy(image.cloudinary_id);
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