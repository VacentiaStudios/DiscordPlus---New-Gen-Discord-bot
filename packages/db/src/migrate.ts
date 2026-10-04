import { runMigrations } from './migrator';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL tanımlı değil.');
  process.exit(1);
}

try {
  await runMigrations(connectionString);
  console.log('Veritabanı migration işlemi tamamlandı.');
} catch (error) {
  console.error('Migration başarısız oldu:', error);
  process.exit(1);
}
