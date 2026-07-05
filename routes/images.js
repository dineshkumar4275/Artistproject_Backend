// backend/routes/images.js
import express from 'express';
import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();

<<<<<<< HEAD
// =======================
// GET ALL GALLERY IMAGES
// =======================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM images WHERE type = $1 ORDER BY created_at DESC',
      ['gallery']
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
        type: row.type,
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
// GET PHOTOGRAPHY IMAGES
// =======================
router.get('/photography', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM images WHERE type = $1 ORDER BY created_at DESC',
      ['photography']
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
        type: row.type,
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
// UPLOAD GALLERY IMAGE (FILE)
// =======================
=======
// =========================
// GET ALL IMAGES
// =========================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM images ORDER BY created_at DESC'
    );

    const images = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      imageUrl: cloudinary.utils.private_download_url(
        row.cloudinary_id,
        'jpg',
        {
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }
      ),
      cloudinary_id: row.cloudinary_id,
      createdAt: row.created_at,
    }));

    res.json(images);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================
// UPLOAD IMAGE FILE
// =========================
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image selected',
      });
    }

<<<<<<< HEAD
    const { title, type = 'gallery' } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Upload to Cloudinary as PRIVATE
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: type === 'photography' ? 'photography' : 'gallery',
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
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, type];
    const dbResult = await pool.query(query, values);

    // Generate signed URL
    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
=======
    const { title } = req.body;

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'gallery',
        type: 'private',
      }
    );

    const dbResult = await pool.query(
      `
      INSERT INTO images (title, cloudinary_id, url)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        title || 'Untitled',
        uploadResult.public_id,
        uploadResult.secure_url,
      ]
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
    );

    res.status(201).json({
<<<<<<< HEAD
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      type: image.type,
      created_at: image.created_at,
      createdAt: image.created_at
=======
      success: true,
      image: dbResult.rows[0],
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
    });
  } catch (error) {
    console.error('Upload error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

<<<<<<< HEAD
// =======================
// UPLOAD GALLERY IMAGE BY URL
// =======================
=======
// =========================
// UPLOAD IMAGE BY URL
// =========================
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
router.post('/url', async (req, res) => {
  try {
<<<<<<< HEAD
    const { imageUrl, title, secret, type = 'gallery' } = req.body;
    
    if (!secret || secret !== UPLOAD_SECRET) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized: Invalid secret key' 
      });
    }
    
=======
    const { imageUrl, title } = req.body;

>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
    if (!imageUrl || !title) {
      return res.status(400).json({
        success: false,
        error: 'Image URL and title are required',
      });
    }

<<<<<<< HEAD
    console.log('📤 Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: type === 'photography' ? 'photography' : 'gallery',
      resource_type: 'auto',
      type: 'private',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful');

    // Save to database
    const query = `
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, type];
    const dbResult = await pool.query(query, values);
    
    console.log('✅ Database save successful');

    // Generate signed URL
    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
      'jpg',
      { expires_at: Math.floor(Date.now() / 1000) + 3600 }
=======
    const uploadResult = await cloudinary.uploader.upload(
      imageUrl,
      {
        folder: 'gallery',
        type: 'private',
      }
    );

    const dbResult = await pool.query(
      `
      INSERT INTO images (title, cloudinary_id, url)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        title,
        uploadResult.public_id,
        uploadResult.secure_url,
      ]
    );

    const signedUrl = cloudinary.utils.private_download_url(
      uploadResult.public_id,
      'jpg',
      {
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
    );

    res.status(201).json({
<<<<<<< HEAD
      id: image.id,
      title: image.title,
      url: signedUrl,
      imageUrl: signedUrl,
      cloudinary_id: image.cloudinary_id,
      type: image.type,
      created_at: image.created_at,
      createdAt: image.created_at
=======
      success: true,
      id: dbResult.rows[0].id,
      title,
      imageUrl: signedUrl,
      cloudinary_id: uploadResult.public_id,
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
    });
  } catch (error) {
    console.error('Upload URL error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

<<<<<<< HEAD
// =======================
// UPLOAD PHOTOGRAPHY IMAGE (FILE)
// =======================
router.post('/photography', upload.single('image'), async (req, res) => {
  try {
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

    // Upload to Cloudinary as PRIVATE
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

    // Save to database
    const query = `
      INSERT INTO images (title, cloudinary_id, url, image_url, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [title, result.public_id, result.secure_url, result.secure_url, 'photography'];
    const dbResult = await pool.query(query, values);

    // Generate signed URL
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
      type: image.type,
      created_at: image.created_at,
      createdAt: image.created_at
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload photography image' });
  }
});

// =======================
// DELETE IMAGE
// =======================
=======
// =========================
// DELETE SINGLE IMAGE
// =========================
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await pool.query(
      'SELECT * FROM images WHERE id = $1',
      [id]
    );

    if (image.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    await cloudinary.uploader.destroy(
      image.rows[0].cloudinary_id,
      {
        type: 'private',
      }
    );

    await pool.query(
      'DELETE FROM images WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

<<<<<<< HEAD
// =======================
// DELETE ALL IMAGES
// =======================
=======
// =========================
// DELETE ALL IMAGES
// =========================
>>>>>>> f75d238021fa897788e846d26944fabe9f0e8090
router.delete('/', async (req, res) => {
  try {
    const images = await pool.query(
      'SELECT * FROM images'
    );

    for (const image of images.rows) {
      await cloudinary.uploader.destroy(
        image.cloudinary_id,
        {
          type: 'private',
        }
      );
    }

    await pool.query(
      'DELETE FROM images'
    );

    res.json({
      success: true,
      message: 'All images deleted successfully',
    });
  } catch (error) {
    console.error('Delete all error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
