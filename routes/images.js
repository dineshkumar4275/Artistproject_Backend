// backend/routes/images.js
import express from 'express';
import pool, { ensureTables } from '../config/db.js';
import cloudinary, { getSignedUrl } from '../config/cloudinary.js';
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
    
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'images'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Images table does not exist yet');
      return res.json([]);
    }
    
    const result = await pool.query(
      "SELECT * FROM images WHERE type = 'gallery' OR type IS NULL ORDER BY created_at DESC"
    );
    
    console.log(`✅ Found ${result.rows.length} gallery images`);
    
    const images = result.rows.map(row => {
      let signedUrl = '';
      try {
        signedUrl = getSignedUrl(row.cloudinary_id);
      } catch (e) {
        console.error('Error getting signed URL for:', row.id, e.message);
      }
      
      return {
        id: row.id,
        title: row.title || 'Untitled',
        description: row.description || '',
        url: signedUrl || row.url || '',
        imageUrl: signedUrl || row.url || '',
        cloudinary_id: row.cloudinary_id || '',
        type: row.type || 'gallery',
        is_featured: row.is_featured || false,
        created_at: row.created_at,
        createdAt: row.created_at
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('❌ Error fetching gallery images:', error);
    res.json([]);
  }
});

// =======================
// GET ALL PHOTOGRAPHY IMAGES (from Neon DB)
// =======================
// backend/routes/images.js - Update GET photography

router.get('/photography', async (req, res) => {
  try {
    console.log('📸 Fetching photography images from Neon DB...');
    
    const result = await pool.query(
      "SELECT id, title, description, image_data, image_type, type, is_featured, created_at FROM images WHERE type = 'photography' ORDER BY created_at DESC"
    );
    
    console.log(`✅ Found ${result.rows.length} photography images`);
    
    const images = result.rows.map(row => {
      let imageUrl = '';
      
      if (row.image_data) {
        imageUrl = `/api/images/photography/image/${row.id}`;
      }
      
      return {
        id: row.id,
        title: row.title || 'Untitled',
        description: row.description || '',
        url: imageUrl,
        imageUrl: imageUrl,
        image_type: row.image_type || 'image/jpeg',
        type: row.type || 'photography',
        is_featured: row.is_featured || false,
        created_at: row.created_at,
        createdAt: row.created_at,
        is_stored_in_db: !!row.image_data
      };
    });
    
    res.json(images);
  } catch (error) {
    console.error('❌ Error fetching photography images:', error);
    res.json([]);
  }
});
// =======================
// GET SINGLE PHOTOGRAPHY IMAGE FROM NEON DB
// =======================
router.get('/photography/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📸 Fetching image ${id} from Neon DB...`);
    
    const result = await pool.query(
      'SELECT image_data, image_type FROM images WHERE id = $1 AND type = $2',
      [id, 'photography']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    const image = result.rows[0];
    
    if (!image.image_data) {
      return res.status(404).json({ success: false, error: 'Image data not found' });
    }
    
    res.setHeader('Content-Type', image.image_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(image.image_data);
    
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch image' });
  }
});

// =======================
// UPLOAD PHOTOGRAPHY IMAGE TO NEON DB
// =======================
// backend/routes/images.js - Add this route

// =======================
// UPLOAD PHOTOGRAPHY IMAGE TO NEON DB
// =======================
router.post('/photography/neon-upload', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Photography upload started (Neon DB storage)');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (!req.file.mimetype.includes('jpeg') && !req.file.mimetype.includes('jpg')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only JPEG/JPG images are allowed' 
      });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        error: 'File size exceeds 10MB limit' 
      });
    }

    const query = `
      INSERT INTO images (title, description, image_data, image_type, type, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, title, description, image_type, type, created_at
    `;
    
    const values = [
      title, 
      description || '', 
      req.file.buffer,
      req.file.mimetype,
      'photography'
    ];
    
    const dbResult = await pool.query(query, values);
    const image = dbResult.rows[0];
    
    console.log('✅ Image saved to Neon DB:', image.id);

    res.status(201).json({
      success: true,
      id: image.id,
      title: image.title,
      description: image.description || '',
      image_type: image.image_type,
      type: image.type || 'photography',
      created_at: image.created_at,
      createdAt: image.created_at,
      url: `/api/images/photography/image/${image.id}`
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
// SAVE PHOTOGRAPHY IMAGE (Legacy - Cloudinary)
// =======================
router.post('/photography/save', async (req, res) => {
  try {
    console.log('📸 Saving photography image to database...');
    
    const { title, description, cloudinary_id, url, type } = req.body;
    
    if (!title || !cloudinary_id || !url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, cloudinary_id, and url are required' 
      });
    }

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, description || '', cloudinary_id, url, type || 'photography'];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');
    
    const image = dbResult.rows[0];
    res.status(201).json({
      success: true,
      id: image.id,
      title: image.title,
      description: image.description || '',
      url: image.url,
      cloudinary_id: image.cloudinary_id,
      type: image.type || 'photography',
      is_featured: image.is_featured || false,
      created_at: image.created_at,
      createdAt: image.created_at
    });
    
  } catch (error) {
    console.error('❌ Save error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save photography image',
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

    console.log('✅ Cloudinary upload successful');

    const query = `
      INSERT INTO images (title, description, cloudinary_id, url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, description || '', result.public_id, result.secure_url, 'gallery'];
    const dbResult = await pool.query(query, values);

    const image = dbResult.rows[0];
    
    const signedUrl = getSignedUrl(image.cloudinary_id);

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
      folder: 'gallery',
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
    
    const signedUrl = getSignedUrl(image.cloudinary_id);

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
// UPLOAD PHOTOGRAPHY IMAGE - JPEG ONLY (Legacy - Cloudinary)
// =======================
router.post('/photography', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Photography upload started (legacy)');
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

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
    
    const signedUrl = getSignedUrl(image.cloudinary_id);

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

    if (image.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(image.cloudinary_id);
      } catch (e) {
        console.log('⚠️ Cloudinary delete failed:', e.message);
      }
    }
    
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
      if (image.cloudinary_id) {
        try {
          await cloudinary.uploader.destroy(image.cloudinary_id);
        } catch (e) {
          console.log('⚠️ Cloudinary delete failed:', e.message);
        }
      }
    }

    await pool.query('DELETE FROM images');

    res.json({ success: true, message: 'All images deleted successfully' });
  } catch (error) {
    console.error('❌ Delete all error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all images' });
  }
});

export default router;