import { cleanupStaleReservations, errorResponse, json } from '../../_shared/http.js';

export async function onRequestGet({ request, env }) {
  if (!env.WEDDING_DB || !env.TURNSTILE_SITE_KEY || !env.DEVICE_HASH_SALT) {
    return errorResponse('NOT_CONFIGURED', 503);
  }

  await cleanupStaleReservations(env.WEDDING_DB);
  const hardLimit = 8_000_000_000;
  const configuredLimit = Math.min(Number(env.MAX_STORAGE_BYTES) || hardLimit, hardLimit);
  await env.WEDDING_DB.prepare('UPDATE app_settings SET max_storage_bytes = ? WHERE id = 1')
    .bind(configuredLimit)
    .run();

  const settings = await env.WEDDING_DB.prepare(
    'SELECT uploads_open FROM app_settings WHERE id = 1',
  ).first();

  return json({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    uploadsOpen: settings?.uploads_open === 1,
    maxBatchFiles: 3,
    maxFileBytes: 8 * 1024 * 1024,
  });
}
