# MyHealthyPlant - Clone (Customized)
This project is a **clean-room implementation** inspired by the public site `myhealthyplant.vercel.app`.
It reproduces the *functionality* (plant diagnosis UI, AI integration hooks, About and other pages)
but contains original code. The name "Muganga Martin" has been replaced with **Sseremba Joachim**.

## Features
- React frontend (Vite)
- Express backend
- `/api/diagnose` — placeholder endpoint to integrate Gemini Vision or another image-based model
- `/api/weather` — proxies to OpenWeatherMap (or other weather API) and returns structured weather info
- Frontend auto-detects user location (via browser geolocation) to show real-time weather + icons and wind
- Simple page structure: Home, Ask AI, Diagnoser, About

## Quick start (local)
1. Copy `.env.example` to `.env` in the backend folder and set keys.
2. Install backend dependencies and start server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Install frontend and start:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Open the frontend URL (usually http://localhost:5173)

## Notes about Gemini Vision & AI
- This repo contains a **stub** integration for Gemini Vision. To integrate, replace the stub in `backend/services/gemini.js` with real API calls and add your API key to `.env`.
- Do not share your API keys publicly.

## License & Ethics
This is provided as a starting point for developers. If you intend to reproduce content from the original public site,
ensure you have the right to reuse any copyrighted assets (text, images, logos). This implementation uses original UI code.

---
