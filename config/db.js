import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database with proper handling
const initDB = async () => {
  try {
    console.log('🔧 Checking database schema...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'images'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📦 Creating images table...');
      await pool.query(`
        CREATE TABLE images (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
          cloudinary_id VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Images table created successfully');
    } else {
      console.log('📊 Table exists, checking columns...');
      
      // Check existing columns
      const columns = await pool.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'images';
      `);
      
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('📋 Existing columns:', columnNames.join(', '));
      
      // Handle each column
      if (!columnNames.includes('title')) {
        console.log('➕ Adding title column...');
        await pool.query(`ALTER TABLE images ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled';`);
        await pool.query(`ALTER TABLE images ALTER COLUMN title SET NOT NULL;`);
      } else {
        // Check if column is NOT NULL
        const titleCol = columns.rows.find(col => col.column_name === 'title');
        if (titleCol && titleCol.is_nullable === 'YES') {
          console.log('🔧 Fixing title column (handling NULL values)...');
          
          // Update NULL values first
          await pool.query(`UPDATE images SET title = 'Untitled' WHERE title IS NULL;`);
          
          // Make NOT NULL
          await pool.query(`ALTER TABLE images ALTER COLUMN title SET NOT NULL;`);
        }
      }
      
      if (!columnNames.includes('cloudinary_id')) {
        console.log('➕ Adding cloudinary_id column...');
        await pool.query(`ALTER TABLE images ADD COLUMN cloudinary_id VARCHAR(255) NOT NULL DEFAULT 'temp_id';`);
      } else {
        const cloudCol = columns.rows.find(col => col.column_name === 'cloudinary_id');
        if (cloudCol && cloudCol.is_nullable === 'YES') {
          console.log('🔧 Fixing cloudinary_id column (handling NULL values)...');
          await pool.query(`UPDATE images SET cloudinary_id = 'temp_id' WHERE cloudinary_id IS NULL;`);
          await pool.query(`ALTER TABLE images ALTER COLUMN cloudinary_id SET NOT NULL;`);
        }
      }
      
      if (!columnNames.includes('url')) {
        console.log('➕ Adding url column...');
        await pool.query(`ALTER TABLE images ADD COLUMN url TEXT NOT NULL DEFAULT 'temp_url';`);
      } else {
        const urlCol = columns.rows.find(col => col.column_name === 'url');
        if (urlCol && urlCol.is_nullable === 'YES') {
          console.log('🔧 Fixing url column (handling NULL values)...');
          await pool.query(`UPDATE images SET url = 'temp_url' WHERE url IS NULL;`);
          await pool.query(`ALTER TABLE images ALTER COLUMN url SET NOT NULL;`);
        }
      }
      
      console.log('✅ All columns verified');
    }
    
    // Final verification
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'images'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Final table schema:');
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Show row count
    const count = await pool.query('SELECT COUNT(*) FROM images');
    console.log(`📈 Total rows in table: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('Detailed error:', error);
  }
};

// Initialize database
initDB();

export default pool;