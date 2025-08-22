import express from "express";
import fetch from "node-fetch";

const app = express();

// Accept both URL-encoded (OAuth token form) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (_req, res) => res.status(200).json({ ok: true, service: "tina-gpt-proxy" }));

// ---------- OAuth passthrough (Option A) ----------
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * ChatGPT opens this URL for user consent. We immediately redirect to Google
 * with the exact same querystring ChatGPT provided (client_id, redirect_uri, scope, state, etc).
 */
app.get("/oauth/authorize", (req, res) => {
  const params = new URLSearchParams(req.query || {}).toString();
  return res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

/**
 * ChatGPT posts here to exchange code->tokens (and later refresh tokens).
 * We forward the form body to Google's token endpoint and return Google's JSON.
 */
app.post("/oauth/token", async (req, res) => {
  try {
    // Build x-www-form-urlencoded body from whatever we got
    const bodyParams = new URLSearchParams();
    const src = req.body || {};
    for (const [k, v] of Object.entries(src)) {
      if (v !== undefined && v !== null) bodyParams.append(k, String(v));
    }

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    };

    // If ChatGPT sends Basic auth (client_id/secret), pass it through
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;

    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers,
      body: bodyParams
    });

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (err) {
    console.error("OAuth token proxy error:", err);
    return res.status(500).json({ error: "OAuth token proxy error" });
  }
});

// ---------- Helper to read Google bearer token on action calls ----------
function getGoogleToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// ---------- Gmail: send ----------
app.post("/gmail/send", async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) return res.status(401).json({ error: "Missing Google OAuth token" });

    const { to, cc, bcc, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields: to, subject, body" });
    }

    const headersStr = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      bcc ? `Bcc: ${bcc}` : null,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8"
    ].filter(Boolean).join("\r\n");

    const raw = Buffer.from(`${headersStr}\r\n\r\n${body}`)
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    const g = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw })
    });

    const data = await g.json();
    if (!g.ok) return res.status(g.status).json(data);
    return res.json({ status: "ok", messageId: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error sending email" });
  }
});

// ---------- Calendar: create event ----------
app.post("/calendar/events", async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) return res.status(401).json({ error: "Missing Google OAuth token" });

    const { title, description, location, start, end, attendees } = req.body || {};
    if (!title || !start || !end) {
      return res.status(400).json({ error: "Missing required fields: title, start, end" });
    }

    const event = {
      summary: title,
      description,
      location,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: (attendees || []).map(a => ({ email: a.email, optional: !!a.optional }))
    };

    const g = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });

    const data = await g.json();
    if (!g.ok) return res.status(g.status).json(data);
    return res.json({ status: "ok", eventId: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error creating event" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tina-gpt-proxy listening on ${PORT}`));

