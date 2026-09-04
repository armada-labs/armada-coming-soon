/**
 * Contact form endpoint. Runs as a Vercel serverless function at /api/contact.
 *
 * Sends the enquiry to the studio inbox through Postmark.
 *
 * Environment variables (set in the Vercel project):
 *   POSTMARK_SERVER_TOKEN  Server API token from the Postmark account.   (required)
 *   CONTACT_TO             Inbox that receives enquiries.                 (default hello@armadalabs.co.uk)
 *   CONTACT_FROM           Sender address. Must be a verified Postmark    (default hello@armadalabs.co.uk)
 *                          sender signature or on a verified domain.
 */

const MAX = { name: 200, email: 320, organisation: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 2500; // Forms submitted faster than this are almost always bots.

function clip(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wantsJson(req) {
  const accept = String(req.headers['accept'] || '');
  const type = String(req.headers['content-type'] || '');
  return accept.includes('application/json') || type.includes('application/json');
}

function parseBody(req) {
  const type = String(req.headers['content-type'] || '');
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  if (type.includes('application/json')) {
    try { return JSON.parse(text); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

function respond(req, res, status, payload, redirectTo) {
  if (wantsJson(req) || !redirectTo) {
    res.status(status).json(payload);
    return;
  }
  // Plain HTML form post (JavaScript unavailable): bounce back to the page.
  res.statusCode = 303;
  res.setHeader('Location', redirectTo);
  res.end();
}

async function sendViaPostmark({ token, from, to, replyTo, subject, textBody, htmlBody }) {
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      ReplyTo: replyTo,
      Subject: subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: 'outbound',
      Tag: 'contact-form',
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || (body && body.ErrorCode)) {
    throw new Error(`Postmark ${r.status}: ${body.Message || 'unknown error'}`);
  }
  return body;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  const body = parseBody(req);
  const name = clip(body.name, MAX.name);
  const email = clip(body.email, MAX.email);
  const organisation = clip(body.organisation, MAX.organisation);
  const message = clip(body.message, MAX.message);

  // Honeypot: a filled "website" field is a bot. Say yes and do nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    respond(req, res, 200, { success: true }, '/contact#sent');
    return;
  }
  // Timing check: only enforced when the client supplied a start time.
  const started = Number(body.started);
  if (Number.isFinite(started) && started > 0 && Date.now() - started < MIN_FILL_MS) {
    respond(req, res, 200, { success: true }, '/contact#sent');
    return;
  }

  if (!name || !email || !message) {
    respond(req, res, 400, { success: false, error: 'Please add your name, email and a message.' }, '/contact?error=missing#contact-form');
    return;
  }
  if (!EMAIL_RE.test(email)) {
    respond(req, res, 400, { success: false, error: 'That email address does not look right.' }, '/contact?error=email#contact-form');
    return;
  }

  const token = process.env.POSTMARK_SERVER_TOKEN;
  const to = process.env.CONTACT_TO || 'hello@armadalabs.co.uk';
  const from = process.env.CONTACT_FROM || 'hello@armadalabs.co.uk';

  if (!token) {
    console.error('[contact] POSTMARK_SERVER_TOKEN is not set; enquiry not sent', { name, email, organisation });
    respond(req, res, 503, { success: false, error: 'The contact form is not configured yet. Please email hello@armadalabs.co.uk.' }, '/contact?error=unavailable#contact-form');
    return;
  }

  const subject = `Website enquiry: ${name}${organisation ? ` (${organisation})` : ''}`;
  const textBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Organisation: ${organisation || 'N/A'}`,
    '',
    message,
  ].join('\n');
  const htmlBody = `
    <h2>New website enquiry</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    ${organisation ? `<p><strong>Organisation:</strong> ${esc(organisation)}</p>` : ''}
    <p><strong>Message:</strong></p>
    <p>${esc(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    await sendViaPostmark({ token, from, to, replyTo: email, subject, textBody, htmlBody });
  } catch (err) {
    // Never lose an enquiry silently: the details land in the function logs.
    console.error('[contact] send failed', err && err.message, { name, email, organisation, message });
    respond(req, res, 502, { success: false, error: 'Something went wrong sending your message. Please try again, or email hello@armadalabs.co.uk.' }, '/contact?error=send#contact-form');
    return;
  }

  respond(req, res, 200, { success: true }, '/contact#sent');
};
