// index.js
import express from "express";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ========== GOOGLE AUTH SETUP ==========
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// ========== ROOT ROUTE ==========
app.get("/", (req, res) => {
  res.send("🚀 Tina GPT Proxy is running!");
});

// ========== CALENDAR EVENTS ==========
app.get("/calendar/events", async (req, res) => {
  try {
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: "startTime",
    });

    const event = response.data.items[0];
    if (event) {
      res.json({
        summary: event.summary,
        start:
