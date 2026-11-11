const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const decodeJson = (value) => JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));

export async function authorizeAdmin(request, env) {
  const localToken = request.headers.get('Authorization');
  const localQueryToken = new URL(request.url).searchParams.get('dev_token');
  if (
    env.ADMIN_DEV_TOKEN &&
    (localToken === `Bearer ${env.ADMIN_DEV_TOKEN}` || localQueryToken === env.ADMIN_DEV_TOKEN)
  ) return true;

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const domain = String(env.CF_ACCESS_TEAM_DOMAIN ?? '').replace(/\/$/, '');
  const audience = env.CF_ACCESS_AUD;
  if (!token || !domain || !audience || domain.includes('REPLACE_WITH')) return false;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const header = decodeJson(encodedHeader);
    const payload = decodeJson(encodedPayload);
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (
      header.alg !== 'RS256' ||
      !header.kid ||
      payload.iss !== domain ||
      !audiences.includes(audience) ||
      payload.exp <= now ||
      (payload.nbf && payload.nbf > now)
    ) {
      return false;
    }

    const certsResponse = await fetch(`${domain}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!certsResponse.ok) return false;
    const certs = await certsResponse.json();
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch (error) {
    console.error('Cloudflare Access validation failed', error);
    return false;
  }
}
