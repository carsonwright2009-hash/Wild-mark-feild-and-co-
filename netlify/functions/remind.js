// Reminder signup: stores an email address so the owner can send seasonal reminders. Anonymous POST.
const SB = process.env.SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_K;
const H = { apikey: SRK, Authorization: 'Bearer ' + SRK };
const reply = (o, c = 200) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(o) });
exports.handler = async (e) => {
  try {
    if (e.httpMethod !== 'POST') return reply({ error: 'POST only' }, 405);
    let b; try { b = JSON.parse(e.body || '{}'); } catch (_) { return reply({ error: 'bad_json' }, 400); }
    if (b.website) return reply({ ok: true }); // honeypot: bots fill this in
    const email = String(b.email || '').trim().toLowerCase();
    if (email.length > 120 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(email)) return reply({ error: 'bad_email' }, 400);
    // Daily brake so nobody can flood the table.
    const since = new Date(Date.now() - 86400000).toISOString();
    const c = await fetch(SB + '/rest/v1/reminders?created_at=gt.' + encodeURIComponent(since) + '&select=id', { headers: Object.assign({ Prefer: 'count=exact', Range: '0-0' }, H) });
    const total = Number((c.headers.get('content-range') || '').split('/')[1] || 0);
    if (total >= 300) return reply({ error: 'busy' }, 429);
    const r = await fetch(SB + '/rest/v1/reminders?on_conflict=email', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, H),
      body: JSON.stringify({ email }),
    });
    if (!r.ok) return reply({ error: 'save_failed' }, 500);
    return reply({ ok: true });
  } catch (err) { return reply({ error: 'server' }, 500); }
};
