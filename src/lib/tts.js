// ---------------------------------------------------------------------------
// Dynamic Tamil text-to-speech.
//
// Whatever Tamil text you pass in gets spoken fresh, every time — so if a
// client edits a word's "tamil" field in TamilPronounceDemo.jsx, the voice
// automatically matches the new text. No more pre-recorded .wav files to
// swap by hand.
//
// Two engines, tried in order:
//
//   1. Piper backend (best quality, clear voice) — set VITE_PIPER_API_URL in
//      a .env file to point at your Piper TTS server (see README-TTS.md).
//      This is now the primary engine; Google Translate's TTS is no longer
//      used anywhere in this file.
//
//   2. Browser Web Speech API (fallback only, used if the Piper server is
//      unreachable) — most Android phones and Chrome desktops ship a Tamil
//      ("ta-IN") system voice. Quality is more robotic than Piper, but it
//      keeps the app working even if the Piper server is down.
//
// If neither is available, speakTamil() rejects and the UI shows a message
// instead of silently doing nothing.
// ---------------------------------------------------------------------------

const PIPER_API_URL = import.meta.env.VITE_PIPER_API_URL || "";

// Slightly slower than natural speed — words come out clearer and easier
// to follow for someone learning pronunciation. Tweak this one number to
// change the speed everywhere.
const SPEECH_RATE = 0.8;

// Cache generated/played audio per text so repeat taps on the same word
// don't re-hit the Piper backend or restart synthesis unnecessarily.
const audioBlobCache = new Map(); // tamil text -> object URL (Piper only)

function getTamilBrowserVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find((v) => v.lang?.toLowerCase() === "ta-in") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("ta")) ||
    null
  );
}

// Voice lists load asynchronously in some browsers (esp. Chrome) — this
// resolves once they're ready so the first tap doesn't miss the Tamil voice.
let voicesReadyPromise = null;
function voicesReady() {
  if (!("speechSynthesis" in window)) return Promise.resolve([]);
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    // Safety timeout in case the event never fires
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
  return voicesReadyPromise;
}

export async function hasTamilBrowserVoice() {
  await voicesReady();
  return !!getTamilBrowserVoice();
}

function speakWithBrowserTTS(text) {
  return new Promise(async (resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("no-speech-synthesis"));
      return;
    }
    await voicesReady();
    window.speechSynthesis.cancel(); // stop anything currently speaking
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ta-IN";
    const voice = getTamilBrowserVoice();
    if (voice) utter.voice = voice;
    utter.rate = SPEECH_RATE;
    utter.onend = () => resolve("browser");
    utter.onerror = (e) =>
      reject(new Error(e.error || "browser-speech-failed"));
    window.speechSynthesis.speak(utter);
  });
}

function playBlobUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.playbackRate = SPEECH_RATE;
    audio.onended = () => resolve("piper");
    audio.onerror = () => reject(new Error("piper-playback-failed"));
    audio.play().catch(reject);
  });
}

async function speakWithPiperBackend(text) {
  if (!PIPER_API_URL) throw new Error("no-piper-backend-configured");

  if (audioBlobCache.has(text)) {
    return playBlobUrl(audioBlobCache.get(text));
  }

  const form = new FormData();
  form.append("text", text);

  const res = await fetch(`${PIPER_API_URL.replace(/\/$/, "")}/synthesize/`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`piper-http-${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  audioBlobCache.set(text, url);
  return playBlobUrl(url);
}

/**
 * Speak Tamil text dynamically. Tries, in order:
 *   1. Your Piper backend (VITE_PIPER_API_URL) — clear, high-quality voice.
 *   2. The browser's built-in Tamil voice — fallback only, used if the
 *      Piper server is unreachable (e.g. not running, or misconfigured URL).
 * Returns which engine actually spoke: "piper" | "browser".
 * Throws only if both fail.
 */
export async function speakTamil(text) {
  if (PIPER_API_URL) {
    try {
      return await speakWithPiperBackend(text);
    } catch (err) {
      console.warn(
        "[tts] Piper backend failed, falling back to browser voice:",
        err,
      );
    }
  } else {
    console.warn(
      "[tts] VITE_PIPER_API_URL not set — using browser voice. " +
        "Set it in .env to use the Piper server.",
    );
  }

  return speakWithBrowserTTS(text);
}