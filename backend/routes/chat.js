// routes/chat.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { chatWithGroq, GROQ_MODEL } = require('../services/groqClient');

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { messages } = req.body || {};
    const reply = await chatWithGroq({ messages, user: req.user });
    res.json({ reply, model: GROQ_MODEL });
  } catch (err) {
    if (err.message === 'CHAT_MESSAGE_REQUIRED') {
      return res.status(400).json({ error: 'Please type a message first.' });
    }
    if (err.message === 'GROQ_API_KEY_MISSING') {
      return res.status(503).json({ error: 'Chatbot is not configured yet. GROQ_API_KEY is missing.' });
    }
    if (err.message?.startsWith('GROQ_REQUEST_FAILED') || err.message === 'GROQ_EMPTY_RESPONSE') {
      return res.status(502).json({ error: 'Groq chatbot is temporarily unavailable. Please try again.' });
    }
    next(err);
  }
});

module.exports = router;
