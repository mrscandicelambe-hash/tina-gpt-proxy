import express from "express";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// OAuth2 client setup
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Test endpoint
app.get("/", (req, res) => {
  res.send("✅ Tina GPT Proxy is running!");
});

// Example Calendar events endpoint
app.get("/calendar/events", (req, res) => {
  res.json([
    {
      summary: "Coaching with Lillith",
      start: "2025-08-21T09:00:00Z",
      end: "2025-08-21T10:00:00Z",
    },
  ]);
});

//
