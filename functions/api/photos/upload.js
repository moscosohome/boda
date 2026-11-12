import {
  cleanupStaleReservations,
  detectImageType,
  errorResponse,
  hashIdentifier,
  json,
  MAX_BATCH_FILES,
  MAX_FILE_BYTES,
  sameOriginRequest,
  validUuid,
} from '../../_shared/http.js';
import { verifyTurnstile } from '../../_shared/turnstile.js';

const failureCode = (error) => {
  const message = String(error?.message ?? error);
  return ['UPLOADS_CLOSED', 'STORAGE_FULL'].find((code) => message.includes(code));
};

export async function onRequestPost({ request, env }) {
  if (!sameOriginRequest(request)) return errorResponse('INVALID_REQUEST', 403);
  if (!env.WEDDING_DB || !env.WEDDING_PHOTOS || !env.DEVICE_HASH_SALT) {
    return errorResponse('NOT_CONFIGURED', 503);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BATCH_FILES * MAX_FILE_BYTES + 1024 * 1024) {
    return errorResponse('TOO_MANY_FILES', 413);
  }

  const deviceId = request.headers.get('X-Device-Id');
  const batchId = request.headers.get('Idempotency-Key');
  if (!validUuid(deviceId) || !validUuid(batchId)) return errorResponse('INVALID_REQUEST');

  let form;
  try {
    form = await request.formData();
  } catch {
    return errorResponse('INVALID_REQUEST');
  }

  const files = form
    .getAll('photos')
    .filter((entry) => entry && typeof entry === 'object' && typeof entry.arrayBuffer === 'function');
  if (files.length === 0) return errorResponse('INVALID_REQUEST');
  if (files.length > MAX_BATCH_FILES) return errorResponse('TOO_MANY_FILES');

  if (!(await verifyTurnstile(String(form.get('turnstileToken') ?? ''), request, env, batchId))) {
    return errorResponse('TURNSTILE_FAILED', 403);
  }

  const deviceHash = await hashIdentifier(deviceId, env.DEVICE_HASH_SALT);
  const ipHash = await hashIdentifier(
    request.headers.get('CF-Connecting-IP') ?? 'unknown',
    env.DEVICE_HASH_SALT,
  );

  const existing = await env.WEDDING_DB.prepare(
    'SELECT status, response_json FROM upload_batches WHERE id = ? AND device_hash = ?',
  )
    .bind(batchId, deviceHash)
    .first();
  if (existing?.response_json) return json(JSON.parse(existing.response_json));
  if (existing) return errorResponse('BATCH_IN_PROGRESS', 409);

  const windowStart = Date.now() - 10 * 60 * 1000;
  const rate = await env.WEDDING_DB.prepare(
    `SELECT
       SUM(CASE WHEN device_hash = ? THEN 1 ELSE 0 END) AS device_events,
       SUM(CASE WHEN ip_hash = ? THEN 1 ELSE 0 END) AS ip_events
     FROM rate_events WHERE created_at >= ?`,
  )
    .bind(deviceHash, ipHash, windowStart)
    .first();
  if (Number(rate?.device_events ?? 0) >= 24 || Number(rate?.ip_events ?? 0) >= 180) {
    return errorResponse('RATE_LIMITED', 429);
  }
  await env.WEDDING_DB.batch([
    env.WEDDING_DB.prepare('DELETE FROM rate_events WHERE created_at < ?').bind(
      Date.now() - 24 * 60 * 60 * 1000,
    ),
    env.WEDDING_DB.prepare(
      'INSERT INTO rate_events (device_hash, ip_hash, created_at) VALUES (?, ?, ?)',
    ).bind(deviceHash, ipHash, Date.now()),
  ]);

  const validated = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) return errorResponse('FILE_TOO_LARGE', 413);
    if (file.size <= 0) return errorResponse('INVALID_FILE_TYPE', 415);
    const detected = await detectImageType(file);
    if (!detected) return errorResponse('INVALID_FILE_TYPE', 415);
    validated.push({ file, detected, id: crypto.randomUUID() });
  }

  await cleanupStaleReservations(env.WEDDING_DB);
  const hardLimit = 8_000_000_000;
  const configuredLimit = Math.min(Number(env.MAX_STORAGE_BYTES) || hardLimit, hardLimit);
  await env.WEDDING_DB.prepare('UPDATE app_settings SET max_storage_bytes = ? WHERE id = 1')
    .bind(configuredLimit)
    .run();

  const datePrefix = new Date().toISOString().slice(0, 10);
  const records = validated.map((item) => ({
    ...item,
    objectKey: `wedding/${datePrefix}/${item.id}.${item.detected.extension}`,
  }));
  const statements = [
    env.WEDDING_DB.prepare(
      'INSERT INTO upload_batches (id, device_hash) VALUES (?, ?)',
    ).bind(batchId, deviceHash),
    ...records.map((item) =>
      env.WEDDING_DB.prepare(
        `INSERT INTO photos
          (id, object_key, size, mime_type, device_hash, batch_id, original_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        item.id,
        item.objectKey,
        item.file.size,
        item.detected.mime,
        deviceHash,
        batchId,
        item.file.size,
      ),
    ),
  ];

  try {
    await env.WEDDING_DB.batch(statements);
  } catch (error) {
    const code = failureCode(error);
    if (code) return errorResponse(code, code === 'STORAGE_FULL' ? 507 : 409);
    console.error('Photo reservation failed', error);
    return errorResponse('INVALID_REQUEST', 500);
  }

  const results = [];
  for (const record of records) {
    let objectWritten = false;
    try {
      await env.WEDDING_PHOTOS.put(record.objectKey, record.file.stream(), {
        httpMetadata: { contentType: record.detected.mime },
        customMetadata: { photoId: record.id },
      });
      objectWritten = true;
      await env.WEDDING_DB.prepare("UPDATE photos SET status = 'ready' WHERE id = ? AND status = 'reserved'")
        .bind(record.id)
        .run();
      results.push({ clientName: record.file.name, success: true });
    } catch (error) {
      console.error(`R2 upload failed for ${record.id}`, error);
      if (objectWritten) await env.WEDDING_PHOTOS.delete(record.objectKey);
      await env.WEDDING_DB.prepare(
        "UPDATE photos SET status = 'failed', error_code = 'R2_WRITE_FAILED' WHERE id = ? AND status = 'reserved'",
      )
        .bind(record.id)
        .run();
      results.push({ clientName: record.file.name, success: false });
    }
  }

  const succeeded = results.filter((result) => result.success).length;
  const payload = {
    ok: succeeded === results.length,
    uploaded: succeeded,
    failed: results.length - succeeded,
    results,
  };
  const status = succeeded === results.length ? 'complete' : succeeded > 0 ? 'partial' : 'failed';
  await env.WEDDING_DB.prepare(
    `UPDATE upload_batches
     SET status = ?, response_json = ?, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  )
    .bind(status, JSON.stringify(payload), batchId)
    .run();

  return json(payload, succeeded > 0 ? 200 : 502);
}
