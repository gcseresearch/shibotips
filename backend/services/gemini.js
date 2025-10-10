// backend/services/gemini.js
// Replace the internals of `callVisionModel` and `callChatModel` with real provider requests.
// This file keeps the interface stable for the server routes.

const axios = require("axios");
const fs = require("fs");

async function analyzeImageBuffer(buffer) {
  // buffer = image data (Buffer)
  // Placeholder logic: do a simple heuristic or call your real Gemini Vision API here.
  // Example return:
  return {
    plant: "Tomato",
    disease: "Early blight",
    confidence: 0.88,
    advice: "Remove affected leaves, improve airflow, rotate crops next season.",
    relatedImages: [
      // If possible: call an images API and return image URLs
    ]
  };
}

async function callChatModel(messages, context) {
  // messages: [{role:'user'|'assistant', text}]
  // context: optional object describing image analysis
  // Replace this with the real Gemini text/chat API call.
  // Example simple echo/templated reply:
  const latest = messages[messages.length-1].text || "";
  let reply = `I understand. Based on the image context (${context && context.disease ? context.disease : "no disease context"}), here's a short actionable note:\n\n`;
  reply += "- Confirm symptoms visually.\n- Consider the following treatments: cultural controls, fungicide where permitted.\n- When in doubt contact your local extension office.";
  // A real model would return a longer, more tailored reply.
  return { text: reply };
}

module.exports = { analyzeImageBuffer, callChatModel };
