// Stripe calls this after a checkout completes, so Premium turns on even if the
// buyer never returns to the site. The signature proves the call is from Stripe.
const crypto = require('crypto');
const { stripe, saveSub, reply, isLive } = require('../lib/helpers');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function verify(raw, header, secret, now = Date.now()) {
  if (!raw || !header || !secret) return false;
  const parts = {};
  header.split(',').forEach((p) => { const i = p.indexOf('='); if (i > 0) (parts[p.slice(0, i).trim()] = parts[p.slice(0, i).trim()] || []).push(p.slice(i + 1).trim()); });
  const t = (parts.t || [])[0], sigs = parts.v1 || [];
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > 300) return false;
  const want = crypto.createHmac('sha256', secret).update(t + '.' + raw).digest('hex');
  return sigs.some((s) => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

exports.verify = verify;
exports.handler = async (e) => {
  if (e.httpMethod !== 'POST') return reply({ error: 'POST only' }, 405);
  const raw = e.isBase64Encoded ? Buffer.from(e.body || '', 'base64').toString('utf8') : (e.body || '');
  const sig = (e.headers && (e.headers['stripe-signature'] || e.headers['Stripe-Signature'])) || '';
  if (!verify(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)) return reply({ error: 'bad signature' }, 400);
  let ev;
  try { ev = JSON.parse(raw); } catch (_) { return reply({ error: 'bad json' }, 400); }
  try {
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const s = ev.data && ev.data.object;
      const uid = s && s.client_reference_id;
      if (s && s.mode === 'subscription' && s.payment_status === 'paid' && UUID.test(uid || '') && s.customer && s.subscription) {
        // Double-check with Stripe that the subscription is really active before granting Premium.
        const sub = await stripe('/subscriptions/' + encodeURIComponent(s.subscription));
        if (isLive(sub)) await saveSub({ user_id: uid, stripe_customer_id: s.customer, stripe_subscription_id: s.subscription, updated_at: new Date().toISOString() });
      }
    }
    // Cancellations need no action here: /status checks the subscription with Stripe on every page load.
    return reply({ received: true });
  } catch (err) {
    console.error('webhook failed', ev && ev.type, err && err.message);
    return reply({ error: 'handler failed' }, 500); // Stripe retries on 5xx
  }
};
