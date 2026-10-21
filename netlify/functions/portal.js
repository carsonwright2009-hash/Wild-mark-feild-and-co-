// Opens Stripe's Customer Portal so subscribers can cancel or update their card.
const { stripe, getUser, getSub, reply } = require('../lib/helpers');
exports.handler = async (e) => {
  try {
    if (e.httpMethod !== 'POST') return reply({ error: 'POST only' }, 405);
    const user = await getUser(e);
    if (!user) return reply({ error: 'Sign in first' }, 401);
    const row = await getSub(user.id);
    if (!row) return reply({ error: 'No subscription' }, 404);
    const s = await stripe('/billing_portal/sessions', { method: 'POST', body: { customer: row.stripe_customer_id, return_url: process.env.SITE_URL || 'https://warm-pithivier-0cfb30.netlify.app/' } });
    return reply({ url: s.url });
  } catch (err) { return reply({ error: 'Could not open portal' }, 500); }
};
