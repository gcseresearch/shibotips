const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Weather endpoint: accepts ?lat=...&lon=...
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  if (!OPENWEATHER_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY not set on server' });

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const r = await axios.get(url);
    const data = r.data;
    // Return a cleaned object
    const out = {
      location: data.name,
      coords: data.coord,
      weather: data.weather[0],
      main: data.main,
      wind: data.wind,
      dt: data.dt
    };
    res.json(out);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch weather', details: err?.response?.data || err.message });
  }
});

const { analyzeImageBuffer, callChatModel } = require("./services/gemini");

// existing upload multer config...
app.post('/api/diagnose', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "image required" });
    const buf = req.file.buffer;
    const result = await analyzeImageBuffer(buf);
    // Attach some fallback related images if empty (or call Unsplash via server if you have key).
    if (!result.relatedImages || result.relatedImages.length === 0) {
      result.relatedImages = [
        "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=60",
        "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800&q=60"
      ];
    }
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "diagnose failed", details: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  // expects { messages: [{role,text}, ...], imageContext: {...} }
  try {
    const { messages, imageContext } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
    const assistant = await callChatModel(messages, imageContext);
    res.json({ ok: true, assistant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "chat failed", details: err.message });
  }
});


// Serve static frontend in production (optional)
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
