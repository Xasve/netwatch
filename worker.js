// ──────────────────────────────────────────────
//  NetWatch — Cloudflare Worker (proxy CORS)
//  Despliega en: workers.cloudflare.com (gratis)
// ──────────────────────────────────────────────

const CF_STATUS_BASE = 'https://www.cloudflarestatus.com/api/v2';

const ALLOWED_PATHS = [
  '/summary.json',
  '/status.json',
  '/incidents/unresolved.json',
  '/scheduled-maintenances/upcoming.json',
  '/scheduled-maintenances/active.json',
];

export default {
  async fetch(request) {
    // Responde a OPTIONS (preflight CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url  = new URL(request.url);
    const path = url.pathname;

    // Solo permite rutas conocidas de la API
    if (!ALLOWED_PATHS.includes(path)) {
      return new Response(JSON.stringify({ error: 'Ruta no permitida' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    try {
      const upstream = await fetch(`${CF_STATUS_BASE}${path}`, {
        headers: { 'Accept': 'application/json' },
        cf: { cacheTtl: 30, cacheEverything: true }, // cache 30 s en el edge
      });

      const body = await upstream.text();

      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30',
          ...corsHeaders(),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
