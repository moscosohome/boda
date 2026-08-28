const responseHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

const setupPage = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Configurar Telegram</title>
    <style>
      body { max-width: 42rem; margin: 4rem auto; padding: 0 1.25rem; background: #faf5f3; color: #2e2b27; font: 16px/1.6 system-ui, sans-serif; }
      form { display: grid; gap: 1rem; padding: 1.5rem; border: 1px solid rgba(93,87,75,.2); border-radius: .75rem; background: #fffaf2; }
      input, button { min-height: 3rem; border: 1px solid rgba(93,87,75,.25); border-radius: .5rem; padding: .7rem 1rem; font: inherit; }
      button { background: #b37c85; color: white; cursor: pointer; font-weight: 700; }
      code { display: inline-block; padding: .15rem .4rem; border-radius: .25rem; background: #eee1dc; }
      li { margin: .75rem 0; }
    </style>
  </head>
  <body>
    <h1>Obtener el identificador del grupo</h1>
    <p>Introduce la clave temporal configurada en Cloudflare. El token de Telegram no sale del servidor.</p>
    <form id="setup-form">
      <label for="setup-key">Clave temporal</label>
      <input id="setup-key" name="key" type="password" required autocomplete="off">
      <button type="submit">Buscar grupos</button>
    </form>
    <div id="result" role="status" aria-live="polite"></div>
    <script>
      const form = document.querySelector('#setup-form');
      const result = document.querySelector('#result');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        result.textContent = 'Buscando…';
        const response = await fetch(location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: form.elements.key.value }),
        });
        const data = await response.json();
        result.replaceChildren();
        if (!response.ok) {
          result.textContent = data.error || 'No se ha podido completar la consulta.';
          return;
        }
        if (!data.groups.length) {
          result.textContent = 'No aparecen grupos. Envía otro mensaje en el grupo y vuelve a intentarlo.';
          return;
        }
        const heading = document.createElement('h2');
        heading.textContent = 'Grupos encontrados';
        const list = document.createElement('ul');
        for (const group of data.groups) {
          const item = document.createElement('li');
          const title = document.createElement('strong');
          title.textContent = group.title + ': ';
          const id = document.createElement('code');
          id.textContent = group.id;
          item.append(title, id);
          list.append(item);
        }
        result.append(heading, list);
      });
    </script>
  </body>
</html>`;

export function onRequestGet({ env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_SETUP_KEY) {
    return json({ error: 'Telegram setup is not configured' }, 503);
  }

  return new Response(setupPage, {
    headers: { ...responseHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_SETUP_KEY) {
    return json({ error: 'Telegram setup is not configured' }, 503);
  }

  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return json({ error: 'Origin not allowed' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Solicitud incorrecta' }, 400);
  }

  if (typeof payload.key !== 'string' || payload.key !== env.TELEGRAM_SETUP_KEY) {
    return json({ error: 'Clave temporal incorrecta' }, 403);
  }

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`,
  );

  if (!telegramResponse.ok) {
    return json({ error: 'Telegram no ha aceptado la consulta' }, 502);
  }

  const telegramData = await telegramResponse.json();
  if (!telegramData.ok) {
    return json({ error: 'Telegram no ha aceptado el token' }, 502);
  }

  const groups = new Map();
  for (const update of telegramData.result ?? []) {
    const chat =
      update.message?.chat ??
      update.edited_message?.chat ??
      update.channel_post?.chat ??
      update.my_chat_member?.chat;

    if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
      groups.set(String(chat.id), {
        id: String(chat.id),
        title: chat.title || 'Grupo sin nombre',
      });
    }
  }

  return json({ groups: [...groups.values()] });
}
