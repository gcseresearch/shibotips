import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Diagnoser from './pages/Diagnoser';
import About from './pages/About';
import AskAI from './pages/AskAI';
import './styles.css';

function App(){
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="brand">MyHealthyPlant</div>
          <div className="links">
            <a href="/">Home</a>
            <a href="/ask">Ask AI</a>
            <a href="/diagnose">Diagnoser</a>
            <a href="/about">About</a>
          </div>
        </nav>
        <main className="container">
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/ask" element={<AskAI/>} />
            <Route path="/diagnose" element={<Diagnoser/>} />
            <Route path="/about" element={<About/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
