const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static(path.join(__dirname)));

// Translate audio: receives audio blob, returns translated text
app.post('/api/translate', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file received' });
  }

  const { from = 'Russian', to = 'English' } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const audioBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      `Transcribe this audio and translate it from ${from} to ${to}.
       Reply with ONLY the translated text, nothing else.
       No explanations, no notes, just the translation.`,
    ]);

    const text = result.response.text().trim();
    res.json({ translation: text });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Translation failed', detail: err.message });
  }
});

// Health check for Render
app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Translator running on port ${PORT}`));
