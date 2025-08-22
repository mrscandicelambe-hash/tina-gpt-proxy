import express from "express";
import fetch from "node-fetch";

const app = express();

// Middleware: parse bodies + log every request
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get("/", (_req, res) => res.status(200).json({ ok: true, service: "tina-gpt-proxy" }));

// ---------- OAuth passthrough ----------
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Redirect to Google with all query params from ChatGPT
app.get("/oauth/authorize", (req, res) => {
  const params = new URLSearchParams(req.query || {}).toString();
  return res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

// Forward token exchange to Google
app.post("/oauth/token", async (req, res) => {
  try {
    const bodyParams = new URLSearchParams();
    const src = req.body || {};
    for (const [k, v] of Object.entries(src)) {
      if (v !== undefined && v !== null) bodyParams.append(k, String(v));
    }

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    };
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;

    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers,
      body: bodyParams
    });

    const data = await resp.json().catch(() => ({}));
    console.log("OAuth token response:", data);
    return res.status(resp.status).json(data);
  } catch (err) {
    console.error("OAuth token proxy error:", err);
    return res.status(500).json({ error: "OAuth token proxy error" });
  }
});

// ---------- Helper ----------
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

    let { to, cc, bcc, subject, body, message } = req.body || {};
    body = body || message;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields: to, subject, body" });
    }

    console.log("Sending Gmail with:", { to, subject, hasBody: !!body });

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
    console.log("Gmail API response:", data);

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

    console.log("Creating Calendar event:", { title, start, end, attendeeCount: (attendees || []).length });

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
    console.log("Calendar API response:", data);

    if (!g.ok) return res.status(g.status).json(data);
    return res.json({ status: "ok", eventId: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error creating event" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tina-gpt-proxy listening on ${PORT}`));

