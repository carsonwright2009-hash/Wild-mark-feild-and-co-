# Deploy Wildmark with Stripe (test mode first)

## 1. Put the site on GitHub
1. Create a free account at github.com and a new private repository named wildmark.
2. Unzip wildmark-site.zip. On the repo page choose Add file > Upload files, drag in everything (including the netlify folder), and commit.

## 2. Connect Netlify
1. In Netlify open your site > Site configuration > Build & deploy > Link repository, and pick the wildmark repo.
2. Leave the build command empty. Publish directory: `.` (netlify.toml sets this).

## 3. Add variables (Site configuration > Environment variables)
- STRIPE_SECRET_KEY: Stripe Dashboard > Developers > API keys, the test key starting sk_test_
- SUPABASE_URL: https://kwsdkzuqknpaonfhlxjx.supabase.co
- SUPABASE_ANON_KEY: sb_publishable_kysx2jywIXXCCR0SMKNzkg_h63mtgsE
- SUPABASE_SERVICE_ROLE_KEY: Supabase > Project Settings > API Keys, the secret / service_role key. Server only, never paste it in chat or into index.html.
- SITE_URL: https://warm-pithivier-0cfb30.netlify.app/
Then Deploys > Trigger deploy.

## 3b. Set up sign-in in Supabase
- Authentication > URL Configuration: set Site URL to https://warm-pithivier-0cfb30.netlify.app/ and add the same address under Redirect URLs.
- Supabase's built-in email sender is limited to a few emails per hour. Before launch, add your own SMTP provider under Authentication > Emails > SMTP Settings.

## 4. Turn on in Stripe (test mode)
- Settings > Billing > Customer portal: activate it.
- Settings > Billing > Revenue recovery: keep Smart Retries on.

## 5. Test
Sign in with your email link, click Go Premium, pay with 4242 4242 4242 4242, any future date, any CVC. You should return to the site with "Premium is active."

## 6. Go live
1. Finish business verification in Stripe, then switch to live mode.
2. Create a Wildmark Premium product at $10.99 per month and a Payment Link. Set its after-payment redirect to https://YOUR-SITE/?session_id={CHECKOUT_SESSION_ID}
3. Paste the live link into PREMIUM_LINK in index.html and swap STRIPE_SECRET_KEY to the live key (sk_live_). Activate the live Customer Portal.
4. Fill in the [your contact email] and refund-policy placeholders in privacy.html and terms.html.
5. Buy once with a real card, then refund it.

## Notes on the Premium tools
- Live forecast uses Open-Meteo. Its free tier is for non-commercial use, so before charging customers get its commercial plan (or swap `netlify/functions/weather.js` to another provider).
- Group hunt, food planner and trip packet are locked in the page for non-subscribers. That lock is client-side only; the live forecast is checked on the server.
- Offline mode needs the site on https (Netlify provides it). Visit once online, then it loads without signal.
