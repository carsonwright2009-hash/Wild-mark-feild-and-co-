// Called on page load. Premium is on only if the user's Stripe subscription is still active.
const { stripe, getUser, getSub, getComp, reply, isLive } = require('../lib/helpers');
exports.handler = async (e) => {
  try {
    const user = await getUser(e);
    if (!user) return reply({ premium: false }, 401);
    if (await getComp(user)) return reply({ premium: true });
    const row = await getSub(user.id);
    if (!row) return reply({ premium: false });
    const sub = await stripe('/subscriptions/' + row.stripe_subscription_id);
    return reply({ premium: isLive(sub) });
  } catch (err) { return reply({ premium: false }, 500); }
};
