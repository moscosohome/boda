const CANONICAL_HOST = 'cristinayantonio.com.es';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 308);
  }
  return next();
}
