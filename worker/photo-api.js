import { onRequest as handleAdmin } from '../functions/api/admin/[[path]].js';
import { onRequestGet as getPhotoConfig } from '../functions/api/photos/config.js';
import { onRequestPost as uploadPhotos } from '../functions/api/photos/upload.js';
import { json } from '../functions/_shared/http.js';

const notFound = () => json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }, 404);

export default {
  async fetch(request, env, executionContext) {
    const url = new URL(request.url);
    const context = {
      request,
      env,
      waitUntil: (promise) => executionContext.waitUntil(promise),
      passThroughOnException: () => executionContext.passThroughOnException(),
      params: {},
      data: {},
      next: notFound,
      functionPath: url.pathname,
    };

    if (url.pathname === '/api/photos/config' && request.method === 'GET') {
      return getPhotoConfig(context);
    }
    if (url.pathname === '/api/photos/upload' && request.method === 'POST') {
      return uploadPhotos(context);
    }
    if (url.pathname.startsWith('/api/admin/')) {
      context.params.path = url.pathname.slice('/api/admin/'.length);
      return handleAdmin(context);
    }
    return notFound();
  },
};
