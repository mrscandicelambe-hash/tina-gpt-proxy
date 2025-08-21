import express from "express";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// --- Google OAuth client setup ---
const authClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

authClient.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// --- Health check route ---
app.get("/", (req, res) => {
  res.send("🚀 Tina GPT Proxy is running!");
});

// --- Example
