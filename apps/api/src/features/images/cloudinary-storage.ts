import { createHash } from 'node:crypto';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryImage {
  publicId: string;
  secureUrl: string;
}

export class CloudinaryStorageError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'CloudinaryStorageError';
  }
}

export async function uploadCloudinaryImage(
  credentials: CloudinaryCredentials,
  bytes: Buffer,
  contentType: string,
  publicId: string,
  fetcher: typeof fetch = fetch,
): Promise<CloudinaryImage> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    folder: 'rxb-products',
    overwrite: 'false',
    public_id: publicId,
    timestamp,
  };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: contentType }), `product.${contentType.split('/')[1]}`);
  form.append('api_key', credentials.apiKey);
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append('signature', signCloudinaryParams(params, credentials.apiSecret));

  const payload = await sendCloudinaryRequest(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
    form,
    fetcher,
    'Cloudinary upload failed.',
  );
  const publicIdResult = stringProperty(payload, 'public_id');
  const secureUrl = stringProperty(payload, 'secure_url');
  if (publicIdResult !== `rxb-products/${publicId}` || !isCloudinarySecureUrl(secureUrl, credentials.cloudName)) {
    throw new CloudinaryStorageError('Cloudinary returned an invalid image reference.');
  }
  return { publicId: publicIdResult, secureUrl };
}

export async function deleteCloudinaryImage(
  credentials: CloudinaryCredentials,
  publicId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!/^rxb-products\/[0-9a-f-]{36}$/.test(publicId)) {
    throw new CloudinaryStorageError('Cloudinary image reference is invalid.');
  }

  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000).toString() };
  const form = new FormData();
  form.append('api_key', credentials.apiKey);
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append('signature', signCloudinaryParams(params, credentials.apiSecret));

  const payload = await sendCloudinaryRequest(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/destroy`,
    form,
    fetcher,
    'Cloudinary cleanup failed.',
  );
  const result = stringProperty(payload, 'result');
  if (result !== 'ok' && result !== 'not found') {
    throw new CloudinaryStorageError('Cloudinary cleanup failed.');
  }
}

export function isCloudinarySecureUrl(value: string, cloudName: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'res.cloudinary.com'
      && url.pathname.startsWith(`/${cloudName}/image/upload/`)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string): string {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

async function sendCloudinaryRequest(
  url: string,
  body: FormData,
  fetcher: typeof fetch,
  failureMessage: string,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(url, { method: 'POST', body, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new CloudinaryStorageError(failureMessage);
  }

  if (!response.ok) throw new CloudinaryStorageError(failureMessage, response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CloudinaryStorageError('Cloudinary returned an invalid response.', response.status);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CloudinaryStorageError('Cloudinary returned an invalid response.', response.status);
  }
  return payload as Record<string, unknown>;
}

function stringProperty(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new CloudinaryStorageError('Cloudinary returned an invalid response.');
  }
  return value;
}
