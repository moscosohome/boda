export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_BATCH_FILES = 3;

export const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });

export const sameOriginRequest = (request) => {
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') return false;

  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
};

export const errorResponse = (code, status = 400) => {
  const messages = {
    INVALID_REQUEST: 'La solicitud no es válida.',
    UPLOADS_CLOSED: 'La subida de recuerdos está cerrada en este momento.',
    STORAGE_FULL: 'Ya hemos recibido todos los recuerdos que podemos guardar. Gracias por intentarlo.',
    RATE_LIMITED: 'Has hecho varios intentos seguidos. Espera un momento y vuelve a probar.',
    TURNSTILE_FAILED: 'No hemos podido verificar la subida. Actualiza la página y vuelve a intentarlo.',
    FILE_TOO_LARGE: 'Esta foto pesa demasiado. El máximo es 8 MB.',
    INVALID_FILE_TYPE: 'Esta foto no tiene un formato compatible.',
    TOO_MANY_FILES: 'Puedes seleccionar un máximo de 3 recuerdos por tanda.',
    BATCH_IN_PROGRESS: 'Esta subida ya se está procesando.',
    NOT_CONFIGURED: 'El servicio de fotos todavía no está configurado.',
  };
  return json({ error: { code, message: messages[code] ?? 'Ha ocurrido un problema inesperado.' } }, status);
};

export const sha256 = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const hashIdentifier = (value, salt) => sha256(`${salt}:${value}`);

export const validUuid = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const detectImageType = async (file) => {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)) {
    return { mime: 'image/png', extension: 'png' };
  }
  const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') {
    const brands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];
    for (let offset = 8; offset + 4 <= Math.min(bytes.length, 40); offset += 4) {
      if (brands.includes(ascii(offset, 4))) return { mime: 'image/heic', extension: 'heic' };
    }
  }
  return null;
};

export const cleanupStaleReservations = async (db) => {
  await db.prepare(
    `UPDATE photos SET status = 'failed', error_code = 'STALE_RESERVATION'
     WHERE status = 'reserved' AND julianday(uploaded_at) < julianday('now', '-20 minutes')`,
  ).run();
};
