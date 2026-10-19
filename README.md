# Harmony Hackers Entertainment

Static website for Harmony Hackers Entertainment, with published music and events powered by Supabase.

## Deploy with GitHub Pages

The `Deploy static site to GitHub Pages` workflow publishes the repository root whenever a change is pushed to `main`.

1. In GitHub, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
2. Wait for the Pages workflow to finish. For this repository, the public site URL is `https://joshuawizk.github.io/harmony-hackers-site/`.
3. In Supabase, open **Authentication → URL Configuration**. Set the **Site URL** to `https://joshuawizk.github.io/harmony-hackers-site/` and add `https://joshuawizk.github.io/harmony-hackers-site/**` to the allowed redirect URLs.
4. Resend the admin invitation after updating the redirect settings. Invitation links created while the Site URL pointed at localhost will still redirect to localhost.

The private content editor is at `https://joshuawizk.github.io/harmony-hackers-site/admin.html`. It is intentionally not linked from the public site; Supabase Auth and the `admin_users` allowlist protect editing.

## Supabase

- `supabase-schema.sql` defines the music/events tables, Row Level Security policies, and the public media bucket.
- `supabase-config.js` contains the project URL and browser-safe publishable key. These values are public by design; never put a database password, service-role key, or secret key in browser files.
- Create admin accounts privately in Supabase Auth and add only their Auth user UUIDs to `public.admin_users`.
- Public email/password sign-up should remain disabled.

## Local preview

Serve this folder using a local web server (ES modules do not work when opening the HTML files directly with `file://`). For example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.
