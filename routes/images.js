import express from 'express';
import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();

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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image selected',
      });
    }

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
    );

    res.status(201).json({
      success: true,
      image: dbResult.rows[0],
    });
  } catch (error) {
    console.error('Upload error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================
// UPLOAD IMAGE BY URL
// =========================
router.post('/url', async (req, res) => {
  try {
    const { imageUrl, title } = req.body;

    if (!imageUrl || !title) {
      return res.status(400).json({
        success: false,
        error: 'Image URL and title are required',
      });
    }

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
    );

    res.status(201).json({
      success: true,
      id: dbResult.rows[0].id,
      title,
      imageUrl: signedUrl,
      cloudinary_id: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Upload URL error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =========================
// DELETE SINGLE IMAGE
// =========================
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

// =========================
// DELETE ALL IMAGES
// =========================
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
