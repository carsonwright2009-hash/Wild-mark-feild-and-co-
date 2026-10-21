// Premium-only live forecast. Uses Open-Meteo (check its commercial-use terms before launch).
const { stripe, getUser, getSub, reply, isLive } = require('../lib/helpers');
const j = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error('upstream'); return r.json(); };
exports.handler = async (e) => {
  // Live forecast is switched off until a commercial weather plan is in place.
  if (process.env.FORECAST_ENABLED !== 'true') return reply({ error: 'Live forecast is coming soon.' }, 503);
  try {
    const user = await getUser(e);
    if (!user) return reply({ error: 'Sign in first' }, 401);
    const row = await getSub(user.id);
    const sub = row && await stripe('/subscriptions/' + row.stripe_subscription_id);
    if (!isLive(sub)) return reply({ error: 'Premium required' }, 402);
    const qs = e.queryStringParameters || {};
    const q = (qs.q || '').trim().slice(0, 120);
    if (!q) return reply({ error: 'Enter a location' }, 400);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(qs.date || '') ? qs.date : '';
    let g = null;
    for (const t of [q, ...q.split(',').map((x) => x.trim())].filter(Boolean)) {
      const r = await j('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(t));
      if (r.results && r.results[0]) { g = r.results[0]; break; }
    }
    if (!g) return reply({ error: 'Could not find that place. Try a nearby town name.' }, 404);
    const f = await j('https://api.open-meteo.com/v1/forecast?latitude=' + g.latitude + '&longitude=' + g.longitude +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=16&timezone=auto');
    const d = f.daily, days = d.time;
    let a = 0, b = 7, note = 'Showing the next 7 days.';
    const i = date ? days.indexOf(date) : -1;
    if (i >= 0) { a = i; b = Math.min(i + 3, days.length); note = 'Showing your hunt date and the two days after it.'; }
    else if (date) note = 'Your hunt date is past the 16-day forecast, so this shows the next 7 days instead.';
    const sl = (arr) => arr.slice(a, b);
    const lowF = Math.round(Math.min(...sl(d.temperature_2m_min))), highF = Math.round(Math.max(...sl(d.temperature_2m_max)));
    const windMph = Math.round(Math.max(...sl(d.wind_speed_10m_max)));
    const sum = (arr) => sl(arr).reduce((x, y) => x + (y || 0), 0);
    const snow = sum(d.snowfall_sum), precip = sum(d.precipitation_sum);
    const conditions = [];
    if (highF >= 85) conditions.push('Hot');
    if (lowF <= 35) conditions.push('Cold');
    if (!conditions.length) conditions.push('Mild');
    if (snow >= 0.5) conditions.push('Snow'); else if (precip >= 0.1) conditions.push('Rain');
    if (windMph >= 15) conditions.push('Wind');
    return reply({ place: g.name + (g.admin1 ? ', ' + g.admin1 : ''), lowF, highF, windMph, conditions, elevFt: Math.round((f.elevation || g.elevation || 0) * 3.281), note });
  } catch (err) { return reply({ error: 'Forecast unavailable. Try again later.' }, 500); }
};
