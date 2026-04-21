import fs from 'fs';
import path from 'path';
import { query, transaction } from './index';

export async function runMigrations(): Promise<void> {
  // Create migrations table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await query(
      'SELECT id FROM _migrations WHERE filename = $1',
      [file]
    );

    if (rows.length === 0) {
      console.log(`🔄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await transaction(async (client) => {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
      });

      console.log(`✅ Migration completed: ${file}`);
    }
  }

  // Run seeds
  const seedsDir = path.join(__dirname, 'seeds');
  if (fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      const { rows } = await query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [`seed_${file}`]
      );

      if (rows.length === 0) {
        console.log(`🌱 Running seed: ${file}`);
        const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');

        await transaction(async (client) => {
          await client.query(sql);
          await client.query(
            'INSERT INTO _migrations (filename) VALUES ($1)',
            [`seed_${file}`]
          );
        });

        console.log(`✅ Seed completed: ${file}`);
      }
    }
  }

  console.log('✅ All migrations and seeds completed');
}
