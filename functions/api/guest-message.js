const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const cleanText = (value, maxLength) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);

const inlineValue = (value, maxLength = 240) => {
  if (value === undefined || value === null || value === '') {
    return 'No disponible';
  }

  let serialized;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }

  return cleanText(serialized, maxLength).replace(/\s+/g, ' ') || 'No disponible';
};

export async function onRequestPost({ request, env }) {
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return json({ error: 'Origin not allowed' }, 403);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > 5_000) {
    return json({ error: 'Request too large' }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Honeypot: bots commonly fill every field. Answering successfully avoids teaching them how to bypass it.
  if (cleanText(payload.website, 200)) {
    return json({ ok: true });
  }

  const startedAt = Number(payload.startedAt);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 1_500 || elapsed > 7_200_000) {
    return json({ error: 'Invalid form session' }, 400);
  }

  const name = cleanText(payload.name, 80);
  const message = cleanText(payload.message, 800).replace(/\n{3,}/g, '\n\n');

  if (message.length < 3) {
    return json({ error: 'Message is too short' }, 400);
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ error: 'Message service is not configured' }, 503);
  }

  const sender = name || 'Anónimo';
  const device = payload.device && typeof payload.device === 'object' ? payload.device : {};

  const deviceDetails = [
    `Modelo: ${inlineValue(device.model)}`,
    `Plataforma: ${inlineValue(device.platform)}`,
    `Versión de plataforma: ${inlineValue(device.platformVersion)}`,
    `User-Agent: ${inlineValue(device.userAgent, 500)}`,
    `Pantalla: ${inlineValue(device.screen)}`,
    `Pantalla disponible: ${inlineValue(device.availableScreen)}`,
  ];

  const telegramText = [
    '💌 Nuevo mensaje de la invitación',
    '',
    `De: ${sender}`,
    '',
    message,
    '',
    '📱 DATOS DEL DISPOSITIVO',
    ...deviceDetails,
  ].join('\n');

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: telegramText,
        link_preview_options: { is_disabled: true },
      }),
    },
  );

  if (!telegramResponse.ok) {
    console.error(`Telegram delivery failed with status ${telegramResponse.status}`);
    return json({ error: 'Message delivery failed' }, 502);
  }

  return json({ ok: true });
}
