# Deploy Wildmark with Stripe (test mode first)

## 1. Put the site on GitHub
1. Create a free account at github.com and a new private repository named wildmark.
2. Add the source files, including `public/` and `netlify/`. Never commit environment files or source ZIP archives.

## 2. Connect Netlify
1. In Netlify open your site > Site configuration > Build & deploy > Link repository, and pick the wildmark repo.
2. Leave the build command empty. Publish directory: `public` (netlify.toml sets this).

## 3. Add variables (Site configuration > Environment variables)
- STRIPE_SECRET_KEY: Stripe Dashboard > Developers > API keys, the test key starting sk_test_
- SUPABASE_URL: your Supabase project URL from Project Settings > API.
- SUPABASE_ANON_KEY: your public publishable / anon key from Supabase Project Settings > API.
- SUPABASE_SERVICE_ROLE_KEY: Supabase > Project Settings > API Keys, the secret / service_role key. Server only, never paste it in chat or into public/index.html.
- SITE_URL: https://wildmarkfieldco.com/
Then Deploys > Trigger deploy.

## 3b. Set up sign-in in Supabase
- Authentication > URL Configuration: set Site URL to https://wildmarkfieldco.com/ and add the same address under Redirect URLs.
- Supabase's built-in email sender is limited to a few emails per hour. Before launch, add your own SMTP provider under Authentication > Emails > SMTP Settings.

## 4. Turn on in Stripe (test mode)
- Settings > Billing > Customer portal: activate it.
- Settings > Billing > Revenue recovery: keep Smart Retries on.

## 5. Test
Sign in with your email link, click Go Premium, pay with 4242 4242 4242 4242, any future date, any CVC. You should return to the site with "Premium is active."

## 6. Go live
1. Finish business verification in Stripe, then switch to live mode.
2. Create a Wildmark Premium product at $10.99 per month and a Payment Link. Set its after-payment redirect to https://YOUR-SITE/?session_id={CHECKOUT_SESSION_ID}
3. Paste the live link into PREMIUM_LINK in public/index.html and swap STRIPE_SECRET_KEY to the live key (sk_live_). Activate the live Customer Portal.
4. Fill in the [your contact email] and refund-policy placeholders in privacy.html and terms.html.
5. Buy once with a real card, then refund it.

## Notes on the Premium tools
- Live forecast uses Open-Meteo. Its free tier is for non-commercial use, so before charging customers get its commercial plan (or swap `netlify/functions/weather.js` to another provider).
- Group hunt, food planner and trip packet are locked in the page for non-subscribers. That lock is client-side only; the live forecast is checked on the server.
- Offline mode needs the site on https (Netlify provides it). Visit once online, then it loads without signal.

## Secrets scanning and credential recovery

The published site contains only `public/`; Functions remain in `netlify/functions`.
Keep secrets scanning enabled. Only `SITE_URL`, `SUPABASE_URL`, and
`SUPABASE_ANON_KEY` are omitted because they are public configuration. Never omit
`STRIPE_SECRET_KEY`, Supabase service-role keys, or `RESEND_API_KEY`.

A Stripe secret was present in `.env.example` and the removed source ZIP archive.
Revoke that key in Stripe immediately, create a replacement, and update
`STRIPE_SECRET_KEY` in Netlify with Functions scope. Redeploy after replacing it.
Removing a file does not revoke credentials or remove them from Git history or
previous deployments; treat the old key as compromised. Review Stripe activity
for unauthorized use and remove any publicly accessible old deployments containing
the archive. Populate `.env.example` only with empty values or obvious placeholders.
