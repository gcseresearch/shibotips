// app.js - simple client logic for Shibo FarmTips
// IMPORTANT: set API_BASE to your backend URL (e.g. https://mybackend.onrender.com)
// If empty, it will call same origin `/api` endpoints.
const API_BASE = ""; // <-- set your backend base URL here, e.g. "https://shibotips-backend.onrender.com"

const qs = (s, p=document) => p.querySelector(s);
const qsa = (s,p=document) => Array.from(p.querySelectorAll(s));

function el(tag, props={}, children=[]) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  if (typeof children === "string") e.innerHTML = children;
  else children.forEach(c => e.appendChild(c));
  return e;
}

// Navigation
qsa('[data-nav]').forEach(a => {
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    const tgt = a.dataset.nav;
    showPage(tgt);
    qsa('.nav-link').forEach(n => n.classList.remove('active'));
    qsa(`.nav-link[data-nav="${tgt}"]`).forEach(n => n.classList.add('active'));
  });
});

function showPage(id) {
  qsa('.page').forEach(p => p.classList.add('hidden'));
  const s = qs(`#${id}`);
  if (s) s.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

qs('#goto-diagnose').addEventListener('click',() => {
  showPage('diagnose');
  qsa('.nav-link').forEach(n => n.classList.remove('active'));
  qsa('.nav-link[data-nav="diagnose"]').forEach(n => n.classList.add('active'));
});
qs('#back-home').addEventListener('click', ()=> showPage('home'));

qs('#year').textContent = new Date().getFullYear();
qs('#repo-link').setAttribute('href', 'https://github.com/gcseresearch/shibotips');

// Weather: get coords and fetch from backend
async function fetchWeather(lat, lon) {
  const base = API_BASE || '';
  const url = `${base}/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('weather fetch failed');
  return r.json();
}

function renderWeatherCard(data) {
  // Expecting a cleaned structure: { main, weather, wind, location }
  const container = qs('#weather-mini');
  container.innerHTML = '';
  if (!data) {
    container.appendChild(el('div',{className:'card weather-card'}, ['No data']));
    return;
  }
  const w = el('div',{className:'card weather-card'});
  const icon = chooseWeatherEmoji(data.weather);
  w.appendChild(el('div',{className:'weather-emoji', innerText: icon, style:'font-size:48px'}));
  w.appendChild(el('div',{className:'weather-temp', innerText: `${Math.round(data.main.temp)}°C`}));
  w.appendChild(el('div',{className:'weather-desc', innerText: `${data.weather.main} — ${data.location || ''}`}));
  w.appendChild(el('div',{className:'small', innerText: `Wind: ${data.wind.speed} m/s`}));
  container.appendChild(w);
}

function chooseWeatherEmoji(weatherObj={}) {
  // Simple emoji mapping by id or main
  const id = weatherObj.id || 0;
  const main = (weatherObj.main || '').toLowerCase();
  if (main.includes('rain') || id >= 500 && id < 600) return '🌧️';
  if (main.includes('storm') || id >= 200 && id < 300) return '⛈️';
  if (main.includes('snow') || id >= 600 && id < 700) return '❄️';
  if (id === 800) return '☀️';
  if (id > 800) return '⛅';
  return '🌤️';
}

async function tryLoadWeather() {
  const weatherMini = qs('#weather-mini');
  weatherMini.innerHTML = el('div',{className:'card weather-card'}, ['Loading weather…']).outerHTML;
  if (!navigator.geolocation) {
    weatherMini.innerHTML = el('div',{className:'card'}, ['Geolocation not available']).outerHTML;
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    try {
      const data = await fetchWeather(lat, lon);
      renderWeatherCard(data);
    } catch (err) {
      console.error(err);
      weatherMini.innerHTML = el('div',{className:'card'}, ['Unable to load weather']).outerHTML;
    }
  }, (err) => {
    console.warn('geolocation denied', err);
    weatherMini.innerHTML = el('div',{className:'card'}, ['Allow location access to view weather']).outerHTML;
  }, {timeout:10000});
}

qs('#refresh-weather').addEventListener('click', tryLoadWeather);
tryLoadWeather(); // initial

// Diagnose form
const diagnoseForm = qs('#diagnose-form');
const imageInput = qs('#image-input');
const analyzeBtn = qs('#analyze-btn');
const resultCard = qs('#diagnose-result');

diagnoseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = imageInput.files[0];
  if (!file) return alert('Please choose an image file to upload.');
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';
  try {
    const fd = new FormData();
    fd.append('image', file);
    const base = API_BASE || '';
    const resp = await fetch(`${base}/api/diagnose`, { method:'POST', body: fd });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || 'Diagnosis error');
    }
    const json = await resp.json();
    const r = json.result || json;
    qs('#res-plant').textContent = r.plant || 'Unknown';
    qs('#res-disease').textContent = r.disease || 'Unknown';
    qs('#res-confidence').textContent = r.confidence ? `(${Math.round(r.confidence * 100)}%)` : '';
    qs('#res-advice').textContent = r.advice || 'No advice returned.';
    resultCard.classList.remove('hidden');
    showPage('diagnose');
  } catch (err) {
    console.error(err);
    alert('Diagnosis failed. Check console for details.');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze';
  }
});
