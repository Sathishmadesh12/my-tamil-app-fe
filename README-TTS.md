# Dynamic Tamil voice — how it works now

Before: every word had a hardcoded `audio: "/voices/xxx.wav"` file. Editing
the Tamil text did **not** change the voice — you had to manually regenerate
and swap the `.wav` file every time.

Now: `src/lib/tts.js` generates speech **live**, from whatever text is
in `word.tamil` at that moment. Edit the word in
`src/TamilPronounceDemo.jsx` → the voice automatically matches, no audio
files to manage.

## Engine 1 (works right now, zero setup): Browser Tamil voice

Uses the Web Speech API (`speechSynthesis`) with `lang: "ta-IN"`. Most
Android phones and Chrome/Edge desktop installs ship a built-in Tamil voice
("Google தமிழ்"), so this just works out of the box — no backend, no API
key, free.

Limitations: quality is more robotic than Piper, and a few older/locked-down
browsers (notably some iOS Safari versions) don't ship a Tamil voice at all.
When that happens, the app shows a small error message under the listen
button instead of failing silently.

## Engine 2 (optional, better quality): your own Piper server

**Important:** `https://piper.ttstool.com` is a public *demo page* for
trying Piper voices in-browser. It does not expose a documented public API
your app can call (no CORS, not meant for other sites' production traffic).
To get real Piper audio in this app, you need to run your own small Piper
server and point the app at it.

1. Get a Tamil Piper voice model (`.onnx` + `.onnx.json`), e.g.
   `ta_IN-rasa_female-medium` from Hugging Face
   (`tinisoft/piper-ta_IN-rasa_female-medium`).

2. Run a tiny server, for example with FastAPI:

   ```python
   # server.py
   from fastapi import FastAPI, Form
   from fastapi.responses import StreamingResponse
   from fastapi.middleware.cors import CORSMiddleware
   from piper.voice import PiperVoice
   import io, wave

   app = FastAPI()
   app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

   voice = PiperVoice.load("ta_IN-rasa_female-medium.onnx")

   @app.post("/synthesize/")
   def synthesize(text: str = Form(...)):
       buf = io.BytesIO()
       with wave.open(buf, "wb") as wav_file:
           voice.synthesize(text, wav_file)
       buf.seek(0)
       return StreamingResponse(buf, media_type="audio/wav")
   ```

   ```bash
   pip install piper-tts fastapi uvicorn python-multipart
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```

   Host this anywhere that can run Python (a small VPS, Render, Railway,
   Hugging Face Spaces, etc.) — a static Vite build alone can't run Piper,
   it needs this backend.

3. In the React app, copy `.env.example` to `.env` and set:

   ```
   VITE_PIPER_API_URL=https://your-piper-server.example.com
   ```

4. Rebuild (`npm run build`). The app will now call your Piper server first
   for every word and fall back to the browser voice only if that request
   fails.

## Caching

Piper responses are cached in memory per word for the session, so tapping
the same word again doesn't re-hit your server every time.
