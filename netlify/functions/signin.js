// Sends the sign-in link ourselves: Supabase makes the link, Resend delivers it.
const { reply } = require('../lib/helpers');

const SB = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const SITE = (process.env.SITE_URL || '').replace(/\/+$/, '') + '/';
const FROM = process.env.MAIL_FROM || 'Wildmark Field Co. <onboarding@resend.dev>';

exports.handler = async (e) => {
  try { return await run(e); } catch (x) { return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'crash', detail: String(x && x.message).slice(0, 160) }) }; }
};

async function run(e) {
  if (e.httpMethod !== 'POST') return reply({ error: 'POST only' }, 405);
  let email = '';
  try { email = String(JSON.parse(e.body || '{}').email || '').trim().toLowerCase(); } catch (_) {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return reply({ error: 'bad_email' }, 400);
  try {
    const g = await fetch(SB + '/auth/v1/admin/generate_link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SRK, Authorization: 'Bearer ' + SRK },
      body: JSON.stringify({ type: 'magiclink', email, redirect_to: SITE }),
    });
    const gj = await g.json();
    const link = gj.action_link || (gj.properties && gj.properties.action_link);
    if (!g.ok || !link) { console.error('generate_link', g.status, JSON.stringify(gj).slice(0, 300)); return reply({ error: 'link_failed', detail: g.status + ' ' + JSON.stringify(gj).slice(0, 160) }, 502); }

    const m = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Your Wildmark Field Co. sign-in link',
        html: '<p>Tap to sign in to Wildmark Field Co.:</p><p><a href="' + link + '">Sign in</a></p><p>If you did not ask for this, ignore this email.</p>',
        text: 'Sign in to Wildmark Field Co.: ' + link,
      }),
    });
    if (!m.ok) {
      const mj = await m.json().catch(() => ({}));
      console.error('resend', m.status, JSON.stringify(mj).slice(0, 300));
      return reply({ error: 'send_failed', detail: mj.message || '' }, 502);
    }
    return reply({ ok: true });
  } catch (err) {
    console.error('signin error', err && err.message, 'env:', !!SB, !!SRK, !!RESEND, !!process.env.SITE_URL);
    return reply({ error: 'server_error', detail: String(err && err.message).slice(0, 160), env: [!!SB, !!SRK, !!RESEND, !!process.env.SITE_URL] }, 500);
  }
}
