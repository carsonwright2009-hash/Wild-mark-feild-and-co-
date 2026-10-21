const SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY = process.env.STRIPE_SECRET_KEY;

async function stripe(path, { method = 'GET', body } = {}) {
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? new URLSearchParams(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Stripe error');
  return j;
}
const bearer = (e) => ((e.headers && (e.headers.authorization || e.headers.Authorization)) || '').replace(/^Bearer /, '');

// Who is calling? Ask Supabase to validate the signed-in user's token.
async function getUser(e) {
  const t = bearer(e);
  if (!t) return null;
  const r = await fetch(SB + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + t } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}
const srk = { apikey: SRK, Authorization: 'Bearer ' + SRK };
async function getSub(uid) {
  const r = await fetch(SB + '/rest/v1/subscriptions?user_id=eq.' + encodeURIComponent(uid) + '&select=*', { headers: srk });
  if (!r.ok) throw new Error('db read failed');
  const j = await r.json();
  return j[0] || null;
}
async function saveSub(row) {
  const r = await fetch(SB + '/rest/v1/subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, srk),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error('db write failed');
}
const reply = (o, c = 200) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });
const isLive = (s) => !!s && (s.status === 'active' || s.status === 'trialing');
module.exports = { stripe, getUser, getSub, saveSub, reply, isLive };
