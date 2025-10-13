# Armada Labs — Coming Soon

A minimal static landing page ready for Vercel.

## Quick Deploy (Vercel)

1. Create a GitHub repo (e.g. `armada-coming-soon`).
2. Upload this folder's contents to the repo.
3. Go to Vercel → **New Project** → Import your GitHub repo.
4. Framework preset: **Other** (static). No build step needed.
5. After deploy, in Project Settings → **Domains**, add `armadalabs.studio` (or your chosen domain).
6. In Cloudflare DNS, add a CNAME for `@` or `www` pointing to the Vercel target that Vercel shows you.

## Notes
- The logo lives at `assets/Armada-Labs-Logo-Wide.jpg`.
- All styles are inline in `index.html` to keep the bundle tiny.
- Update the mailto address if needed.
