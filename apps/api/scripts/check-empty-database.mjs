// Read-only pre-migration safety check. Connects with DIRECT_DATABASE_URL
// (or DATABASE_URL), prints only the host and database name, and exits
// non-zero unless the target has no tables, views, sequences, or custom types
// in its public schema and no Prisma migration history. Never prints credentials.
import pg from 'pg';

const raw = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!raw) { console.error('Set DIRECT_DATABASE_URL (preferred) or DATABASE_URL first.'); process.exit(2); }
let target;
try { target = new URL(raw); } catch { console.error('The database URL is not a valid URL.'); process.exit(2); }
console.log(`Target: host=${target.hostname} database=${target.pathname.replace(/^\//, '') || '(default)'}`);

const client = new pg.Client({ connectionString: raw });
try {
  await client.connect();
  const { rows } = await client.query(`
    select
      (select count(*) from pg_tables where schemaname = 'public')::int as tables,
      (select count(*) from pg_views where schemaname = 'public')::int as views,
      (select count(*) from pg_sequences where schemaname = 'public')::int as sequences,
      (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e')::int as enums,
      (select count(*) from pg_tables where tablename = '_prisma_migrations')::int as prisma_history`);
  const counts = rows[0];
  console.log(`Found: ${counts.tables} tables, ${counts.views} views, ${counts.sequences} sequences, ${counts.enums} enum types, prisma history: ${counts.prisma_history ? 'yes' : 'no'}`);
  if (Object.values(counts).some(value => value > 0)) {
    console.error('NOT EMPTY: do not run first-release migrations against this database. Confirm the target before continuing.');
    process.exitCode = 1;
  } else {
    console.log('EMPTY: safe target for the first migrate deploy.');
  }
} catch (error) {
  console.error(`Could not inspect the database (${error instanceof Error ? error.constructor.name : 'error'}). Check the URL, network, and TLS settings.`);
  process.exitCode = 2;
} finally {
  await client.end().catch(() => undefined);
}
