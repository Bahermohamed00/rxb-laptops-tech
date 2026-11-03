import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { validateDatabaseUrl } from './src/config/database-url.ts';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: validateDatabaseUrl(process.env.DIRECT_DATABASE_URL || env('DATABASE_URL')),
  },
});
