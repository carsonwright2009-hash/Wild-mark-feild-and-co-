// Anonymous usage counter: adds 1 to a per-day total for a fixed list of event names.
// Stores no IP address, cookie, email or user id.
const SB = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_K;
const ALLOWED = ['view', 'kit_built', 'template_used', 'premium_click', 'signin_start', 'share_click', 'guide_view', 'layer_used'];
const done = (c) => ({ statusCode: c, headers: { 'Cache-Control': 'no-store' }, body: '' });

exports.handler = async (e) => {
  if (e.httpMethod !== 'POST') return done(405);
  let name = '';
  try { name = String(JSON.parse(e.body || '{}').name || ''); } catch (_) {}
  if (!ALLOWED.includes(name)) return done(400);
  try {
    const r = await fetch(SB + '/rest/v1/rpc/bump_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SRK, Authorization: 'Bearer ' + SRK },
      body: JSON.stringify({ p_name: name }),
    });
    return done(r.ok ? 204 : 502);
  } catch (_) { return done(502); }
};
