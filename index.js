// --- Calendar events endpoint (real events) ---
app.get("/calendar/events", async (req, res) => {
  try {
    const calendar = google.calendar({ version: "v3", auth: authClient });

    const response = await calendar.events.list({
      calendarId: "primary",        // primary calendar
      timeMin: new Date().toISOString(),  // only future events
      maxResults: 5,                // adjust if you want more
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    if (events.length === 0) {
      return res.json({ message: "No upcoming events found." });
    }

    // Clean response (only key info)
    const formatted = events.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});
