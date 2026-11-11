export async function verifyTurnstile(token, request, env, idempotencyKey) {
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;

  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET_KEY);
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  if (idempotencyKey) form.set('idempotency_key', idempotencyKey);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const result = await response.json();
    if (!result.success) return false;

    const expectedHostname = env.TURNSTILE_EXPECTED_HOSTNAME;
    return (
      (!expectedHostname || result.hostname === expectedHostname) &&
      (!result.action || result.action === 'photo-upload')
    );
  } catch {
    return false;
  }
}
