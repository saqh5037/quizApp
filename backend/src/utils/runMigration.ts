import { sequelize } from '../config/database';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  try {
    const migrationPath = path.join(__dirname, '../migrations/create-public-quiz-results.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await sequelize.query(sql);
    console.log('Migration executed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();