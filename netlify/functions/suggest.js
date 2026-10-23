// Anonymous "suggest an item" box. Stores only the category and the text. No name, IP or account.
const SB = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_K;
const CATS = ['Legal', 'Safety', 'Navigation', 'Field', 'Optics', 'Weapon', 'Clothing', 'Camp', 'Water', 'Food', 'Comms', 'Truck cache', 'Other'];
const done = (c, o) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(o || {}) });
const H = { apikey: SRK, Authorization: 'Bearer ' + SRK };

exports.handler = async (e) => {
  if (e.httpMethod !== 'POST') return done(405);
  let b = {};
  try { b = JSON.parse(e.body || '{}'); } catch (_) { return done(400); }
  const category = CATS.includes(b.category) ? b.category : 'Other';
  const body = String(b.body || '').replace(/\s+/g, ' ').trim();
  if (body.length < 3 || body.length > 300) return done(400, { error: 'Suggestions need 3 to 300 characters.' });
  if (/https?:|www\.|\.com\b/i.test(body)) return done(400, { error: 'Please leave links out of suggestions.' });
  try {
    // Simple spam brake: stop if more than 300 suggestions arrived in the last day.
    const since = new Date(Date.now() - 864e5).toISOString();
    const c = await fetch(SB + '/rest/v1/suggestions?select=id&created_at=gte.' + encodeURIComponent(since) + '&limit=1', { headers: Object.assign({ Prefer: 'count=exact' }, H) });
    const total = parseInt(((c.headers.get('content-range') || '').split('/')[1]) || '0', 10) || 0;
    if (total > 300) return done(429, { error: 'Too many suggestions today. Please try again tomorrow.' });
    const r = await fetch(SB + '/rest/v1/suggestions', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H),
      body: JSON.stringify({ category, body }),
    });
    return r.ok ? done(204) : done(502);
  } catch (_) { return done(502); }
};
