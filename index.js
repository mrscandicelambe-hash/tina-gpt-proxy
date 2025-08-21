import express from "express";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// OAuth client setup
const authClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

authClient.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Tina GPT Proxy is running!");
});

// Example Calendar events endpoint
app.get("/calendar/events", (req, res) => {
  res.json({
    events: [
      {
        summary: "Coaching with Lillian",
        start: "2025-08-21T20:00:00Z",
        end: "2025-08-21T21:00:00Z",
      },
    ],
  });
});

// Gmail send endpoint
app.post("/gmail/send", async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const gmail = google.gmail({ version: "v1", auth: authClient });

  const rawMessage = [
    `To: ${to}`,
    "Content-
