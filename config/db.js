// backend/config/db.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Neon PostgreSQL connected successfully');
    release();
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

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
      
      await pool.query(`
        CREATE TABLE images (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          cloudinary_id VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'gallery' CHECK (type IN ('gallery', 'photography')),
          is_featured BOOLEAN DEFAULT FALSE,
          uploaded_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Images table created successfully');
    } else {
      console.log('✅ Images table already exists');
      
      // ✅ DROP image_url column if it exists (fix for the error)
      console.log('🔍 Checking for image_url column...');
      const imageUrlCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'image_url'
      `);
      
      if (imageUrlCheck.rows.length > 0) {
        console.log('⚠️ Dropping image_url column...');
        await pool.query(`ALTER TABLE images DROP COLUMN image_url`);
        console.log('✅ image_url column dropped successfully');
      }

      // Add description if missing
      const descCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'description'
      `);
      
      if (descCheck.rows.length === 0) {
        console.log('📝 Adding description column...');
        await pool.query(`ALTER TABLE images ADD COLUMN description TEXT`);
        console.log('✅ Description column added');
      }

      // Add type if missing
      const typeCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'type'
      `);
      
      if (typeCheck.rows.length === 0) {
        console.log('📝 Adding type column...');
        await pool.query(`
          ALTER TABLE images 
          ADD COLUMN type VARCHAR(50) DEFAULT 'gallery' 
          CHECK (type IN ('gallery', 'photography'))
        `);
        console.log('✅ Type column added');
      }

      // Add is_featured if missing
      const featuredCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'is_featured'
      `);
      
      if (featuredCheck.rows.length === 0) {
        console.log('📝 Adding is_featured column...');
        await pool.query(`
          ALTER TABLE images 
          ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
        `);
        console.log('✅ is_featured column added');
      }

      // Add uploaded_by if missing
      const uploadedByCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'uploaded_by'
      `);
      
      if (uploadedByCheck.rows.length === 0) {
        console.log('📝 Adding uploaded_by column...');
        await pool.query(`
          ALTER TABLE images 
          ADD COLUMN uploaded_by INTEGER
        `);
        console.log('✅ uploaded_by column added');
      }
    }

    // Create users table
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

    console.log('✅ All tables are ready!');
  } catch (error) {
    console.error('❌ Error ensuring tables:', error);
  }
};
// backend/config/db.js - Add this inside ensureTables function

// Create users table
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
  
  // ✅ Create default admin user
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin123!', salt);
  
  await pool.query(
    'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
    ['admin@kameshfineart.com', hashedPassword, 'admin']
  );
  console.log('✅ Default admin user created (admin@kameshfineart.com / Admin123!)');
}

export default pool;