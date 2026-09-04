# armadalabs.studio

Marketing site for Armada Labs Studio Ltd. Static HTML and CSS with one serverless function for the contact form. No build step.

- `index.html` — home page
- `contact.html` — contact page with the enquiry form (served at `/contact`)
- `api/contact.js` — Vercel function that sends enquiries through Postmark
- `assets/site.css` — shared styles
- `assets/armada-mark.svg` — logo mark (nav, contact section, favicon)
- `assets/Armada-Logo-Square.jpg` — raster logo (Open Graph image, Apple touch icon)
- `assets/unicorn/` — Unicorn Studio scene for the animated hero background
- `vercel.json` — clean URLs and asset caching

## Contact form

Submissions post to `/api/contact`, which emails the studio inbox via Postmark (the same provider Remy and Penwell use). Bots are filtered with a honeypot field and a minimum fill time. Without JavaScript the form still posts and redirects back to `/contact#sent`.

Environment variables to set on the Vercel project:

| Variable | Required | Purpose |
| --- | --- | --- |
| `POSTMARK_SERVER_TOKEN` | yes | Server API token from the Armada Labs Postmark account (`POSTMARK_API_KEY` also accepted) |
| `CONTACT_TO` | no | Inbox that receives enquiries (default `hello@armadalabs.co.uk`) |
| `CONTACT_FROM` | no | Sender address; must be a verified Postmark sender or domain (default `hello@armadalabs.co.uk`) |

Until the token is set the form shows a "not configured" message and points people at the email address.

## Local preview

`vercel dev --listen 3002` serves the site with clean URLs and the API function at http://localhost:3002. Put the variables above in a `.env` file (git-ignored) to test sending.

## Deploying

The repo is linked to the Vercel project `armada-coming-soon`, which serves www.armadalabs.studio. Pushing to `main` deploys production automatically. A direct deploy from this folder also works with `vercel --prod`.

## Design source

The design handoff lives in `design_handoff_armada_labs_site/` (git-ignored so it isn't published). Its README lists the design tokens and copy; `Armada Labs Site.dc.html` is the pixel reference.
