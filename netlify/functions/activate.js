// Called once after checkout. Links the paid Stripe subscription to the signed-in user.
const { stripe, getUser, saveSub, reply, isLive } = require('../lib/helpers');
exports.handler = async (e) => {
  try {
    const user = await getUser(e);
    if (!user) return reply({ error: 'Sign in first' }, 401);
    const id = (e.queryStringParameters || {}).session_id || '';
    if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return reply({ error: 'Bad session' }, 400);
    const s = await stripe('/checkout/sessions/' + id + '?expand[]=subscription');
    // The session must belong to this user (set via client_reference_id when they clicked Go Premium).
    if (s.client_reference_id !== user.id) return reply({ premium: false }, 403);
    if (s.status !== 'complete' || !s.customer || !isLive(s.subscription)) return reply({ premium: false }, 402);
    await saveSub({ user_id: user.id, stripe_customer_id: s.customer, stripe_subscription_id: s.subscription.id, updated_at: new Date().toISOString() });
    return reply({ premium: true });
  } catch (err) { return reply({ error: 'Could not verify payment' }, 500); }
};
