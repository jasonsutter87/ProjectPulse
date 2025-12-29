import { getDb, initializeSchema, closeDb } from '../src/lib/db';
import { DEFAULT_TAGS } from '../src/types';

console.log('Seeding database...');

try {
  // Ensure schema exists
  initializeSchema();

  const db = getDb();

  // Insert default tags (ignore if already exist)
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)
  `);

  const insertMany = db.transaction((tags: typeof DEFAULT_TAGS) => {
    for (const tag of tags) {
      insertTag.run(tag.name, tag.color);
    }
  });

  insertMany(DEFAULT_TAGS);

  // Verify tags
  const tags = db.prepare('SELECT * FROM tags').all() as { id: number; name: string; color: string }[];
  console.log('Tags in database:');
  tags.forEach((tag) => {
    console.log(`  - ${tag.name} (${tag.color})`);
  });

  console.log('\nDatabase seeded successfully!');
} catch (error) {
  console.error('Failed to seed database:', error);
  process.exit(1);
} finally {
  closeDb();
}
