import express from "express";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Google OAuth client setup
const authClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

authClient.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Health check
app.get("/", (req, res) => {
  res.send("🚀 Tina GPT Proxy is running!");
});

// Example Calendar events endpoint
app.get("/calendar/events", (req, res) => {
  res.json({
    summary: "Coaching with Lillian",
    start: "2025-08-22T10:00:00Z",
    end: "2025-08-22T11:00:00Z",
  });
});

// Gmail send endpoint
app.post("/gmail/send", async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: authClient });

    const rawMessage = [
      `To: ${to}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      message,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
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

    res.json({ status: "✅ Email sent successfully via Gmail!" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// --- Start server ---
app.listen(port, () => {
  console.log(`🚀 Tina GPT Proxy running on port ${port}`);
});
