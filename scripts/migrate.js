// backend/scripts/migrate.js
import pool, { ensureTables } from '../config/db.js';

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  try {
    await ensureTables();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();