// backend/migrations/add-description.js
import pool from '../config/db.js';

async function addDescriptionColumn() {
  try {
    console.log('🔍 Checking if description column exists...');
    
    // Check if description column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'description'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('📝 Adding description column to images table...');
      await pool.query(`
        ALTER TABLE images 
        ADD COLUMN description TEXT
      `);
      console.log('✅ Description column added successfully!');
    } else {
      console.log('✅ Description column already exists');
    }
    
    // Also check and add other columns if needed
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
      console.log('✅ Type column added successfully!');
    }
    
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
      console.log('✅ is_featured column added successfully!');
    }
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addDescriptionColumn();