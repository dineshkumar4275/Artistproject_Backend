// backend/config/db.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon Database Configuration with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
    console.error('📌 Please check your DATABASE_URL in .env');
  } else {
    console.log('✅ Neon PostgreSQL connected successfully');
    release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Helper function to check if table exists and create it
export const ensureTables = async () => {
  try {
    // Check if images table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'images'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📦 Creating images table...');
      
      // Create images table with all necessary columns
      await pool.query(`
        CREATE TABLE images (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          cloudinary_id VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          image_url TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'gallery' CHECK (type IN ('gallery', 'photography')),
          is_featured BOOLEAN DEFAULT FALSE,
          uploaded_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Images table created successfully');
    } else {
      // Ensure type column exists
      const typeColumnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'type'
      `);
      
      if (typeColumnCheck.rows.length === 0) {
        console.log('⚠️ Adding type column to images table...');
        await pool.query(`
          ALTER TABLE images 
          ADD COLUMN type VARCHAR(50) DEFAULT 'gallery' 
          CHECK (type IN ('gallery', 'photography'))
        `);
        console.log('✅ Type column added successfully');
      }

      // Ensure uploaded_by column exists
      const uploadedByCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'uploaded_by'
      `);
      
      if (uploadedByCheck.rows.length === 0) {
        console.log('⚠️ Adding uploaded_by column to images table...');
        await pool.query(`
          ALTER TABLE images 
          ADD COLUMN uploaded_by INTEGER
        `);
        console.log('✅ uploaded_by column added successfully');
      }
    }

    // Create users table for authentication
    const userTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!userTableCheck.rows[0].exists) {
      console.log('📦 Creating users table...');
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Users table created successfully');
    }

  } catch (error) {
    console.error('❌ Error ensuring tables:', error);
  }
};

export default pool;