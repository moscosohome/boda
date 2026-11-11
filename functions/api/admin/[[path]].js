import { authorizeAdmin } from '../../_shared/access.js';
import { cleanupStaleReservations, errorResponse, json, sameOriginRequest } from '../../_shared/http.js';

const unauthorized = () => json({ error: { code: 'UNAUTHORIZED', message: 'Acceso no autorizado.' } }, 401);
const routeName = (params) => {
  const value = params.path;
  return Array.isArray(value) ? value.join('/') : String(value ?? '');
};

async function summary(env, url) {
  await cleanupStaleReservations(env.WEDDING_DB);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 48, 1), 100);
  const before = url.searchParams.get('before');
  const settings = await env.WEDDING_DB.prepare(
    `SELECT uploads_open, max_storage_bytes, total_photos, used_bytes, reserved_bytes, updated_at
     FROM app_settings WHERE id = 1`,
  ).first();
  const query = before
    ? env.WEDDING_DB.prepare(
        `SELECT id, size, mime_type, uploaded_at FROM photos
         WHERE status = 'ready' AND uploaded_at < ? ORDER BY uploaded_at DESC LIMIT ?`,
      ).bind(before, limit)
    : env.WEDDING_DB.prepare(
        `SELECT id, size, mime_type, uploaded_at FROM photos
         WHERE status = 'ready' ORDER BY uploaded_at DESC LIMIT ?`,
      ).bind(limit);
  const photos = await query.all();
  return json({
    settings: {
      uploadsOpen: settings.uploads_open === 1,
      maxStorageBytes: settings.max_storage_bytes,
      totalPhotos: settings.total_photos,
      usedBytes: settings.used_bytes,
      reservedBytes: settings.reserved_bytes,
      updatedAt: settings.updated_at,
    },
    photos: photos.results,
  });
}

async function photoResponse(env, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('INVALID_REQUEST');
  const photo = await env.WEDDING_DB.prepare(
    "SELECT object_key, mime_type FROM photos WHERE id = ? AND status = 'ready'",
  )
    .bind(id)
    .first();
  if (!photo) return new Response('Not found', { status: 404 });
  const object = await env.WEDDING_PHOTOS.get(photo.object_key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': photo.mime_type,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}

async function deletePhoto(env, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('INVALID_REQUEST');
  const photo = await env.WEDDING_DB.prepare(
    "SELECT object_key FROM photos WHERE id = ? AND status = 'ready'",
  )
    .bind(id)
    .first();
  if (!photo) return new Response(null, { status: 404 });
  await env.WEDDING_PHOTOS.delete(photo.object_key);
  await env.WEDDING_DB.prepare("UPDATE photos SET status = 'deleted' WHERE id = ? AND status = 'ready'")
    .bind(id)
    .run();
  return json({ ok: true });
}

async function updateSettings(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_REQUEST');
  }
  if (typeof body.uploadsOpen !== 'boolean') return errorResponse('INVALID_REQUEST');
  await env.WEDDING_DB.prepare(
    `UPDATE app_settings SET uploads_open = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`,
  )
    .bind(body.uploadsOpen ? 1 : 0)
    .run();
  return json({ ok: true, uploadsOpen: body.uploadsOpen });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!env.WEDDING_DB || !env.WEDDING_PHOTOS) return errorResponse('NOT_CONFIGURED', 503);
  if (!(await authorizeAdmin(request, env))) return unauthorized();
  if (!sameOriginRequest(request)) return errorResponse('INVALID_REQUEST', 403);

  const route = routeName(params);
  const url = new URL(request.url);
  if (request.method === 'GET' && route === 'summary') return summary(env, url);
  if (request.method === 'GET' && route === 'photo') return photoResponse(env, url);
  if (request.method === 'DELETE' && route === 'photo') return deletePhoto(env, url);
  if (request.method === 'POST' && route === 'settings') return updateSettings(request, env);
  return new Response('Not found', { status: 404 });
}
