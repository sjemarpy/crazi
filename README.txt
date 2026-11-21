# CRAZI Community

## Files
- `index.html` — single-page community website (GitHub Pages compatible)
- `supabase-schema.sql` — database tables, RLS policies, recovery RPC, image bucket
- `supabase/functions/crazi-admin/index.ts` — protected admin Edge Function

## 1) Create Supabase project
1. Create a project at https://supabase.com
2. Open SQL Editor and run all of `supabase-schema.sql`.
3. In Project Settings > API, copy Project URL and `anon` public key.
4. In `index.html`, replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`.
5. The SQL creates `community-media` bucket (public image URLs, 5MB image limit).

## 2) Deploy the admin function
Install Supabase CLI and login, then from this folder:
```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set CRAZI_ADMIN_PASSWORD=3369
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy crazi-admin
```
The function also receives `SUPABASE_URL` automatically in Supabase Edge Functions.
IMPORTANT: `3369` is a weak starter password. Change it to a long unique secret before publishing. Never put the service-role key in HTML.

## 3) Publish to GitHub Pages
Upload `index.html` to the root of your `crazi.github.io` repository. Enable GitHub Pages from repository Settings > Pages. For custom routes, GitHub Pages serves this SPA at `/`; use the navigation buttons. Direct `/admin` deep links may need a `404.html` fallback copy of `index.html`. The provided app uses `/admin`, `/apply`, `/more` paths and client-side navigation.

## Recovery
A random Recovery Key is generated on first open and its SHA-256 hash is stored in Supabase. On another phone, open the site and choose Recovery, enter the key; the profile identity is restored. Posts and applications remain in the shared community database. Keep the key private. This is not end-to-end encrypted identity recovery.

## Security and moderation notes
This is a functional starter, not a hardened production service. The community tables allow anonymous reads/writes so visitors can post without accounts; this also means spam/abuse is possible. Add CAPTCHA, rate limits, content reporting, image moderation, and stricter server-side validation before public launch. Admin actions are server-side and use the Edge Function; never expose the service-role key.
The admin function uses an expiring signed token, so the session is not dependent on an in-memory server instance.
