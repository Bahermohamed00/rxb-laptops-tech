export function validateDatabaseUrl(value: string): string {
  let database: URL;
  try {
    database = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be an absolute PostgreSQL connection URL.');
  }

  if (database.protocol !== 'postgresql:' && database.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }
  if (!database.hostname) {
    throw new Error('DATABASE_URL must include a PostgreSQL host.');
  }
  if (!database.pathname || database.pathname === '/') {
    throw new Error('DATABASE_URL must include a PostgreSQL database name.');
  }
  if (value.includes('#') || database.hash) {
    throw new Error('DATABASE_URL must not contain a fragment; URL-encode reserved characters in credentials.');
  }

  return value;
}
