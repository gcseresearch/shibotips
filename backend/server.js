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

// Diagnose endpoint: accepts image via multipart form-data at field "image"
app.post('/api/diagnose', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file required' });

  // NOTE: This is a stub. Replace with real Gemini Vision or other model integration.
  // For now we return a mocked response and echo some basic info.
  try {
    // TODO: send req.file.buffer to the vision API
    const mock = {
      plant: 'Maize',
      disease: 'Northern Leaf Blight',
      confidence: 0.87,
      advice: 'Remove affected leaves and apply recommended fungicide according to local regulations.'
    };
    res.json({ ok: true, result: mock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'diagnosis failed', details: err.message });
  }
});

// Serve static frontend in production (optional)
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
