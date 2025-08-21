cat > index.js << 'EOF'
import express from 'express';
import dotenv from 'dotenv';
import open from 'open';
import {
  getAuthUrl,
  handleAuthCode,
  listUpcomingEvents,
  sendEmail
} from './google.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/auth/init', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;
    await handleAuthCode(code);
    res.send('✅ Google authorization successful!');
  } catch (error) {
    res.status(500).send('OAuth error: ' + error.message);
  }
});

app.get('/calendar/events', async (req, res) => {
  try {
    const events = await listUpcomingEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/gmail/send', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const result = await sendEmail({ to, subject, message });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT}/auth/init to authorize your Google account`);
});
EOF

