import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// Health check
app.get("/", (req, res) => {
  res.send("🚀 Tina GPT Proxy is running!");
});

// Calendar events
app.get("/calendar/events", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: "startTime",
    });

    const event = response.data.items?.[0];
    if (!event) {
      return res.json({ message: "📭 No upcoming events" });
    }

    res.json({
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    });
  } catch (err) {
    console.error("❌ Calendar error:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

// Gmail send
app.post("/gmail/send", async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing to, subject, or message" });
  }

  try {
    const encodedMessage = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\n\r\n${message}`
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    res.json({ status: "✅ Email sent successfully via Gmail
