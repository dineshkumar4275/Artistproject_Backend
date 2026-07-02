import express from 'express';
import pool from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import upload from '../middleware/upload.js';

const router = express.Router();

const UPLOAD_SECRET =
  process.env.UPLOAD_SECRET || 'my-super-secret-upload-key-2026-xyz789';


// =====================
// GET ALL IMAGES
// =====================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM images ORDER BY created_at DESC'
    );

    const images = result.rows.map((row) => {
      const signedUrl = cloudinary.utils.private_download_url(
        row.cloudinary_id,
        'jpg',
        {
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }
      );

      return {
        id: row.id,
        title: row.title,
        imageUrl: signedUrl,
        cloudinary_id: row.cloudinary_id,
        createdAt: row.created_at,
      };
    });

    res.json(images);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================
// UPLOAD FILE
// =====================
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image selected',
      });
    }

    const { title } = req.body;

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'gallery',
        type: 'private',
      }
    );

    await pool.query(
      `
      INSERT INTO images(title, cloudinary_id)
      VALUES($1,$2)
      `,
      [title, result.public_id]
    );

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================
// UPLOAD BY URL
// =====================
router.post('/url', async (req, res) => {
  try {
    const { imageUrl, title, secret } = req.body;

    if (secret !== UPLOAD_SECRET) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Invalid secret key',
      });
    }

    if (!imageUrl || !title) {
      return res.status(400).json({
        success: false,
        error: 'Image URL and title required',
      });
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'gallery',
      type: 'private',
    });

    const dbResult = await pool.query(
      `
      INSERT INTO images(title, cloudinary_id)
      VALUES($1,$2)
      RETURNING *
      `,
      [title, result.public_id]
    );

    const signedUrl = cloudinary.utils.private_download_url(
      result.public_id,
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
      cloudinary_id: result.public_id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================
// DELETE IMAGE
// =====================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await pool.query(
      'SELECT * FROM images WHERE id=$1',
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
      'DELETE FROM images WHERE id=$1',
      [id]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


// =====================
// DELETE ALL
// =====================
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

    await pool.query('DELETE FROM images');

    res.json({
      success: true,
      message: 'All images deleted',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
