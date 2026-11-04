const SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_K;
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
// Free Premium list (set by the owner in the comps table). Only for a confirmed email; never expires if until is null.
async function getComp(user) {
  if (!user || !user.email || !(user.email_confirmed_at || user.confirmed_at)) return false;
  const r = await fetch(SB + '/rest/v1/comps?email=eq.' + encodeURIComponent(String(user.email).toLowerCase()) + '&select=until', { headers: srk });
  if (!r.ok) return false;
  const j = await r.json();
  if (!j[0]) return false;
  return !j[0].until || new Date(j[0].until).getTime() > Date.now();
}
// Hunt Pass: one-time purchase that unlocks Premium for 30 days.
const PASS_PRICE = 'price_1UXxarAdh8Pe9EUXBLXoEKuy', PASS_DAYS = 30;
async function getPass(uid) {
  const r = await fetch(SB + '/rest/v1/passes?user_id=eq.' + encodeURIComponent(uid) + '&expires_at=gt.' + encodeURIComponent(new Date().toISOString()) + '&select=expires_at&order=expires_at.desc&limit=1', { headers: srk });
  if (!r.ok) throw new Error('db read failed');
  const j = await r.json();
  return j[0] ? j[0].expires_at : null;
}
// Stores a paid Hunt Pass once per checkout session (session_id is the key, so repeats do nothing).
async function savePass(session, uid) {
  const exp = new Date((session.created + PASS_DAYS * 86400) * 1000).toISOString();
  const r = await fetch(SB + '/rest/v1/passes?on_conflict=session_id', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, srk),
    body: JSON.stringify({ session_id: session.id, user_id: uid, expires_at: exp }),
  });
  if (!r.ok) throw new Error('db write failed');
  return exp;
}
const isPassSession = (s) => !!s && s.mode === 'payment' && s.payment_status === 'paid' && !!(s.line_items && s.line_items.data && s.line_items.data.some((l) => l.price && l.price.id === PASS_PRICE));
const reply = (o, c = 200) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });
const isLive = (s) => !!s && (s.status === 'active' || s.status === 'trialing');
module.exports = { stripe, getUser, getSub, saveSub, getComp, getPass, savePass, isPassSession, PASS_PRICE, reply, isLive };
