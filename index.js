import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (_req, res) => res.status(200).json({ ok: true, service: "tina-gpt-proxy" }));

/**
 * Helper: extract Google OAuth token from Authorization header
 */
function getGoogleToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/**
 * Gmail: send message
 * Body: { to, cc?, bcc?, subject, body }  (body can be plain text or HTML)
 */
app.post("/gmail/send", async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) return res.status(401).json({ error: "Missing Google OAuth token" });

    const { to, cc, bcc, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields: to, subject, body" });
    }

    // Build RFC 5322 email
    const headers = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      bcc ? `Bcc: ${bcc}` : null,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8"
    ].filter(Boolean).join("\r\n");

    const raw = Buffer.from(`${headers}\r\n\r\n${body}`)
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error || data });

    return res.json({ status: "ok", messageId: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error sending email" });
  }
});

/**
 * Calendar: create event
 * Body: { title, description?, location?, start, end, attendees?[{email, optional?}] }
 * start/end must be RFC3339 (e.g., "2025-08-22T13:15:00-03:00")
 */
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
      attendees: (attendees || []).map(a => ({
        email: a.email,
        optional: !!a.optional
      }))
    };

    const resp = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error || data });

    return res.json({ status: "ok", eventId: data.id, htmlLink: data.htmlLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error creating event" });
  }
});

// Render/Heroku/Vercel friendly port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tina-gpt-proxy listening on ${PORT}`));

