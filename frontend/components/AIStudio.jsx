// src/components/AIStudio.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./aistudio.css";

/**
 * API_BASE should be provided via Vite env: import.meta.env.VITE_API_BASE
 * If empty, assumes same origin.
 */
const API_BASE = import.meta.env.VITE_API_BASE || "";

function randomInt(max){ return Math.floor(Math.random()*max); }

/** Build 1000 rotating sample prompts client-side from templates */
function buildSamplePrompts() {
  const crops = ["maize","tomato","potato","banana","coffee","cassava","beans","wheat","sorghum"];
  const problems = ["yellowing leaves","brown spots","wilting","stunted growth","moldy stem","holes in leaves"];
  const actions = ["treatment options","organic remedies","chemical options","preventive steps","timing to spray","how to prune"];
  const prompts = new Set();
  while (prompts.size < 1000) {
    const c = crops[randomInt(crops.length)];
    const p = problems[randomInt(problems.length)];
    const a = actions[randomInt(actions.length)];
    prompts.add(`My ${c} has ${p} — show diagnosis and ${a}.`);
  }
  return Array.from(prompts);
}

const SAMPLE_PROMPTS = buildSamplePrompts();

export default function AIStudio(){
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null); // { plant, disease, confidence, advice, relatedImages: [] }
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // { role: 'user'|'assistant', text }
  const [chatInput, setChatInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestions, setSuggestions] = useState(SAMPLE_PROMPTS.slice(0,5));
  const sampleIdxRef = useRef(0);
  const synthRef = useRef(window.speechSynthesis || null);
  const speakUtteranceRef = useRef(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    // refresh sample suggestions periodically so they are never the same
    const id = setInterval(()=> {
      // pick 5 random different suggestions
      const out = [];
      for(let i=0;i<5;i++){
        out.push(SAMPLE_PROMPTS[(sampleIdxRef.current + i*7) % SAMPLE_PROMPTS.length]);
      }
      sampleIdxRef.current = (sampleIdxRef.current + 13) % SAMPLE_PROMPTS.length;
      setSuggestions(out);
    }, 5000); // refresh every 5s (customize)
    return () => clearInterval(id);
  }, []);

  useEffect(()=>{
    // free preview object when unmounted/changed
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function onFileChange(e){
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    // optionally auto-run analysis
    // analyzeImage(f);
  }

  async function analyzeImage(file){
    setLoading(true);
    setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      // call backend diagnose
      const resp = await axios.post(`${API_BASE || ""}/api/diagnose`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });
      // expected: { result: { plant, disease, confidence, advice, relatedImages: [...] } }
      const payload = resp.data.result || resp.data;
      // if backend does not return relatedImages, try fetching related images client-side (Unsplash placeholder)
      if (!payload.relatedImages) {
        payload.relatedImages = await fetchRelatedImages(payload.plant || payload.disease || "crop");
      }
      setAnalysis(payload);
      // push assistant message summarizing result
      const assistantText = `${payload.plant || "Plant"} — ${payload.disease || "Unknown disease"} (${Math.round((payload.confidence||0)*100)}%).\nAdvice: ${payload.advice || "—"}`;
      setChatMessages(m => [...m, { role: "assistant", text: assistantText }]);
    } catch (err) {
      console.error("analyzeImage error", err);
      alert("Image analysis failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRelatedImages(query){
    // OPTIONAL: if you want real images, create an Unsplash API key and proxy via your backend.
    // Here we return some safe placeholders (data URIs or static images) to keep it "real" without secrets.
    // You can replace this with a fetch to your backend that calls Unsplash or other provider.
    return [
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=60",
      "https://images.unsplash.com/photo-1524594154909-14f6f3f6f64e?w=800&q=60",
      "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800&q=60"
    ].map(u=>`${u}&auto=format&fit=crop`);
  }

  async function onAnalyzeClick(e){
    e.preventDefault();
    if (!imageFile) return alert("Please choose a photo first.");
    await analyzeImage(imageFile);
  }

  // CHAT controls
  async function sendChat(userText){
    if (!userText || !userText.trim()) return;
    setChatMessages(m => [...m, { role: "user", text: userText }]);
    setChatInput("");
    // call backend chat endpoint
    try {
      const resp = await axios.post(`${API_BASE || ""}/api/chat`, {
        messages: [...chatMessages, { role: "user", text: userText }],
        imageContext: analysis ? { plant: analysis.plant, disease: analysis.disease } : null
      }, { timeout: 120000 });
      const assistant = resp.data.assistant || resp.data; // expected { assistant: { text } } or text
      const assistantText = (assistant && (assistant.text || assistant)) || "No answer";
      setChatMessages(m => [...m, { role: "assistant", text: assistantText }]);
      if (voiceEnabled) playText(assistantText);
    } catch (err) {
      console.error("chat error", err);
      alert("Chat failed. Check console for details.");
    }
  }

  function playText(text){
    if (!synthRef.current) return;
    if (speakUtteranceRef.current) {
      synthRef.current.cancel();
      speakUtteranceRef.current = null;
    }
    const u = new SpeechSynthesisUtterance(text);
    // choose voice (prefer Apple/English-like)
    const voices = synthRef.current.getVoices();
    // Attempt to choose a quality voice
    const prefer = voices.find(v => /\b(Apple|Samantha|Alex|en-GB)\b/i.test(v.name)) || voices.find(v=>v.lang && v.lang.startsWith('en')) || voices[0];
    if (prefer) u.voice = prefer;
    u.rate = 0.95;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    speakUtteranceRef.current = u;
    synthRef.current.speak(u);
  }

  function stopSpeaking(){
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsSpeaking(false);
  }

  function copyChat(){
    // copy full chat to clipboard
    const txt = chatMessages.map(m=>`${m.role === "user" ? "You" : "Shibo AI"}: ${m.text}`).join("\n\n");
    navigator.clipboard.writeText(txt).then(()=> alert("Chat copied to clipboard"));
  }

  return (
    <div className="aistudio-root">
      <aside className="aistudio-left">
        <div className="left-card card">
          <h3>Upload / Scan</h3>
          <input type="file" accept="image/*" onChange={onFileChange} />
          <div style={{marginTop:12}}>
            <button className="btn" disabled={loading} onClick={onAnalyzeClick}>Analyze Photo</button>
            <button className="btn outlined" onClick={()=>{ setImageFile(null); setPreviewUrl(null); setAnalysis(null); }}>Clear</button>
          </div>

          <hr style={{margin:'12px 0'}}/>

          <h4>Suggested questions</h4>
          <div className="suggestions">
            {suggestions.map((s,i)=>(
              <button key={i} className="chip" onClick={()=>setChatInput(s)}>{s.length>50? s.slice(0,50)+"…": s}</button>
            ))}
          </div>

          <hr style={{margin:'12px 0'}}/>

          <div className="chat-controls">
            <label>
              <input type="checkbox" checked={voiceEnabled} onChange={e=>setVoiceEnabled(e.target.checked)} /> Voice replies
            </label>
            <button className="btn small" onClick={copyChat}>Copy chat</button>
          </div>
        </div>
      </aside>

      <main className="aistudio-center">
        <div className="center-inner card">
          {previewUrl ? (
            <div className="image-preview" style={{backgroundImage:`url(${previewUrl})`}} />
          ) : (
            <div className="image-placeholder">Upload a photo to start analysis</div>
          )}

          <div className="analysis-panel">
            {loading ? <div className="loader">Analyzing image…</div> : (
              analysis ? (
                <>
                  <h2 className="analysis-title">{analysis.plant || "Plant"} — {analysis.disease || "Diagnosis"}</h2>
                  <div className="analysis-meta">
                    <span>Confidence: {Math.round((analysis.confidence||0)*100)}%</span>
                  </div>
                  <div className="analysis-body">
                    <p>{analysis.advice}</p>
                    <div className="related-images">
                      {analysis.relatedImages && analysis.relatedImages.map((u,idx)=>(
                        <img key={idx} src={u} alt={`related-${idx}`} />
                      ))}
                    </div>
                  </div>
                </>
              ) : <div className="idle-state">No analysis yet</div>
            )}
          </div>
        </div>
      </main>

      <aside className="aistudio-right">
        <div className="right-card card">
          <h3>AI Chat</h3>
          <div className="chat-window">
            {chatMessages.map((m,i)=>(
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="msg-role">{m.role === "user" ? "You" : "Shibo AI"}</div>
                <div className="msg-text">{m.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={(e)=>{e.preventDefault(); sendChat(chatInput);}}>
            <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask about the diagnosis, treatments, etc." />
            <div className="controls-row">
              <button className="btn" type="submit">Send</button>
              <button className="btn outlined" type="button" onClick={()=>setChatInput("")}>Clear</button>
              <button className="btn small" type="button" onClick={()=>{ if (isSpeaking) stopSpeaking(); else if (chatMessages.length) playText(chatMessages[chatMessages.length-1].text); }}>
                {isSpeaking ? "Stop" : "Play last"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
