import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Diagnoser(){
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [weather, setWeather] = useState(null);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    }, err => {
      console.warn('geolocation denied', err);
    });
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      if (!coords) return;
      try {
        const r = await axios.get('/api/weather', { params: coords });
        setWeather(r.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchWeather();
  }, [coords]);

  async function submit(e){
    e.preventDefault();
    if (!file) return alert('Please choose an image file');
    setLoading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await axios.post('/api/diagnose', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(r.data.result || r.data);
    } catch (err) {
      console.error(err);
      alert('Diagnosis failed. See console.');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="card">
        <h1>Diagnoser</h1>
        <p>Upload a photo of the affected crop and get a diagnosis.</p>
        <form className="diagnose-form" onSubmit={submit}>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          <button type="submit" disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
        </form>
        {result && (
          <div className="diagnose-result card">
            <h3>Result</h3>
            <p><strong>Plant:</strong> {result.plant}</p>
            <p><strong>Disease:</strong> {result.disease} ({Math.round(result.confidence*100)}%)</p>
            <p><strong>Advice:</strong> {result.advice}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Local Weather</h2>
        {coords ? (
          weather ? (
            <div className="weather">
              <div>
                <div className="temp">{Math.round(weather.main.temp)}°C</div>
                <div>{weather.weather.description || weather.weather.main}</div>
                <div>Wind: {weather.wind.speed} m/s</div>
                <div>Location: {weather.location || '—'}</div>
              </div>
              <div>
                {/* Simple visual: show sun/cloud emoji based on weather id */}
                <div style={{fontSize:48}}>
                  {weather.weather.id >= 800 ? '☀️' : (weather.weather.id >= 801 ? '⛅' : '☁️')}
                </div>
              </div>
            </div>
          ) : <div>Loading weather…</div>
        ) : <div>Allow location access to show local weather.</div>}
      </div>
    </div>
  );
}
