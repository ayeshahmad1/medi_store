const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

// Lazy-init so .env is fully loaded before accessing GEMINI_API_KEY
let _ai = null;
function getAI() {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in server/.env');
    }
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

/**
 * POST /api/gemini/ask
 * Body:   { "prompt": "user question" }
 * Returns: { "answer": "Gemini response text" }
 */
router.post('/ask', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required and must be a non-empty string.' });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: prompt.trim(),
    });

    const answer = response.text;
    return res.json({ answer });
  } catch (err) {
    console.error('Gemini /ask error:', err.message);

    // Surface quota/rate-limit errors clearly
    if (err.message?.includes('429')) {
      return res.status(429).json({ error: 'Gemini API rate limit reached. Please try again shortly.' });
    }
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.status(500).json({ error: 'Invalid or missing Gemini API key.' });
    }

    return res.status(500).json({ error: 'Failed to get a response from Gemini.', details: err.message });
  }
});

module.exports = router;
