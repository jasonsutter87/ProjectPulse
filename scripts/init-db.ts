import { initializeSchema, closeDb } from '../src/lib/db';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
}

console.log('Initializing database schema...');

try {
  initializeSchema();
  console.log('Database schema initialized successfully!');
  console.log(`Database location: ${path.join(dataDir, 'pulse.db')}`);
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
} finally {
  closeDb();
}
