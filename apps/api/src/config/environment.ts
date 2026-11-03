import { validateDatabaseUrl } from './database-url.js';

export interface ApiEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  DIRECT_DATABASE_URL?: string;
  CORS_ORIGINS: string[];
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  API_RATE_LIMIT: number;
  API_RATE_TTL_MS: number;
  AUTH_LOGIN_LIMIT: number;
  AUTH_LOGIN_TTL_MS: number;
  ADMIN_SESSION_TTL_MS: number;
  TRUST_PROXY_HOPS: number;
  PRODUCT_IMAGE_MAX_BYTES: number;
}

function integer(value: string | undefined, fallback: number, name: string, minimum = 1): number {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`${name} must be an integer of at least ${minimum}.`);
  return parsed;
}

export function validateEnvironment(config: Record<string, unknown>): ApiEnvironment {
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production.');

  const databaseUrl = validateDatabaseUrl(String(config.DATABASE_URL ?? ''));
  const directDatabaseUrl = config.DIRECT_DATABASE_URL ? validateDatabaseUrl(String(config.DIRECT_DATABASE_URL)) : undefined;
  const cloudinary = {
    CLOUDINARY_CLOUD_NAME: String(config.CLOUDINARY_CLOUD_NAME ?? '').trim(),
    CLOUDINARY_API_KEY: String(config.CLOUDINARY_API_KEY ?? '').trim(),
    CLOUDINARY_API_SECRET: String(config.CLOUDINARY_API_SECRET ?? '').trim(),
  };
  const configuredCloudinary = Object.values(cloudinary).filter(Boolean).length;
  if (configuredCloudinary !== 0 && configuredCloudinary !== 3) {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured together.');
  }
  if (cloudinary.CLOUDINARY_CLOUD_NAME && !/^[a-z0-9-]+$/.test(cloudinary.CLOUDINARY_CLOUD_NAME)) {
    throw new Error('CLOUDINARY_CLOUD_NAME must contain only lowercase letters, numbers, and hyphens.');
  }
  const configuredOrigins = String(config.CORS_ORIGINS ?? 'http://127.0.0.1:5183,http://127.0.0.1:5184');
  const corsOrigins = configuredOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  if (!corsOrigins.length || corsOrigins.includes('*')) throw new Error('CORS_ORIGINS must contain explicit origins and cannot contain a wildcard.');
  for (const origin of corsOrigins) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error('CORS_ORIGINS must contain valid origins.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('CORS_ORIGINS values must be origin-only HTTP or HTTPS URLs.');
  }
  if (nodeEnv === 'production' && corsOrigins.some(origin => origin.startsWith('http://'))) throw new Error('Production CORS origins must use HTTPS.');
  if (nodeEnv === 'production' && configuredCloudinary !== 3) {
    throw new Error('Cloudinary credentials are required in production.');
  }

  const port = integer(config.PORT as string | undefined, 5185, 'PORT');
  if (port > 65_535) throw new Error('PORT must be between 1 and 65535.');
  const trustProxyHops = integer(config.TRUST_PROXY_HOPS as string | undefined, 0, 'TRUST_PROXY_HOPS', 0);
  if (trustProxyHops > 5) throw new Error('TRUST_PROXY_HOPS must be between 0 and 5.');
  const productImageMaxBytes = integer(config.PRODUCT_IMAGE_MAX_BYTES as string | undefined, 5 * 1024 * 1024, 'PRODUCT_IMAGE_MAX_BYTES');
  if (productImageMaxBytes > 25 * 1024 * 1024) throw new Error('PRODUCT_IMAGE_MAX_BYTES cannot exceed 25 MB.');

  return {
    NODE_ENV: nodeEnv as ApiEnvironment['NODE_ENV'],
    PORT: port,
    DATABASE_URL: databaseUrl,
    ...(directDatabaseUrl ? { DIRECT_DATABASE_URL: directDatabaseUrl } : {}),
    CORS_ORIGINS: corsOrigins,
    ...(configuredCloudinary === 3 ? cloudinary : {}),
    API_RATE_LIMIT: integer(config.API_RATE_LIMIT as string | undefined, 100, 'API_RATE_LIMIT'),
    API_RATE_TTL_MS: integer(config.API_RATE_TTL_MS as string | undefined, 60_000, 'API_RATE_TTL_MS'),
    AUTH_LOGIN_LIMIT: integer(config.AUTH_LOGIN_LIMIT as string | undefined, 5, 'AUTH_LOGIN_LIMIT'),
    AUTH_LOGIN_TTL_MS: integer(config.AUTH_LOGIN_TTL_MS as string | undefined, 900_000, 'AUTH_LOGIN_TTL_MS'),
    ADMIN_SESSION_TTL_MS: integer(config.ADMIN_SESSION_TTL_MS as string | undefined, 28_800_000, 'ADMIN_SESSION_TTL_MS'),
    TRUST_PROXY_HOPS: trustProxyHops,
    PRODUCT_IMAGE_MAX_BYTES: productImageMaxBytes,
  };
}
