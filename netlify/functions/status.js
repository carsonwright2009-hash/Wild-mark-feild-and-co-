// Called on page load. Premium is on if the user is comped, has an active Stripe subscription, or has an unexpired Hunt Pass.
const { stripe, getUser, getSub, getComp, getPass, reply, isLive } = require('../lib/helpers');
exports.handler = async (e) => {
  try {
    const user = await getUser(e);
    if (!user) return reply({ premium: false }, 401);
    if (await getComp(user)) return reply({ premium: true, plan: 'comp' });
    const row = await getSub(user.id);
    if (row) {
      const sub = await stripe('/subscriptions/' + row.stripe_subscription_id);
      if (isLive(sub)) return reply({ premium: true, plan: 'sub' });
    }
    const until = await getPass(user.id);
    if (until) return reply({ premium: true, plan: 'pass', until });
    return reply({ premium: false });
  } catch (err) { return reply({ premium: false }, 500); }
};
