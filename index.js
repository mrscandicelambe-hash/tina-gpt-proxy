import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Test endpoint
app.get("/", (req, res) => {
  res.send("Tina GPT Proxy is running ✅");
});

// GET /calendar/events
app.get("/calendar/events", (req, res) => {
  res.json([
    {
      summary: "Coaching with Lilli",
      start: "2025-09-02T16:30:00Z",
      end: "2025-09-02T17:30:00Z"
    }
  ]);
});

// POST /gmail/send
app.post("/gmail/send", (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log(`📧 Email sent to ${to} | Subject: ${subject}`);
  res.json({ status: "Email sent successfully (simulated)" });
});

app.listen(PORT, () => {
  console.log(`✅ Tina GPT Proxy running on port ${PORT}`);
});
