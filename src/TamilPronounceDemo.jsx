import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowLeft, Volume2 } from "lucide-react";
import { speakTamil } from "./lib/tts";

// ---- DATA -------------------------------------------------------------
// Grouped the Tamil way: தன்மை (1st person), முன்னிலை (2nd person), படர்க்கை (3rd person).
// Each grammatical person gets its own accent color instead of one flat theme color.
const CATEGORIES = [
  {
    id: "first",
    title: "தன்மை",
    subtitle: "பேசுபவர்",
    color: "#c9861f", // marigold gold
    tint: "#fbf1de",
    words: [
      { tamil: "நான்", roman: "Naan", meaning: "I" },
      {
        tamil: "நாங்கள்",
        roman: "Naangal",
        meaning: "we",
      },
      {
        tamil: "நீங்கள்",
        roman: "Neengal ",
        meaning: "we",
      },
    ],
  },
  {
    id: "second",
    title: "முன்னிலை",
    subtitle: "கேட்பவர்",
    color: "#1b7a6b", // peacock teal
    tint: "#e2f2ee",
    words: [
      { tamil: "நீ", roman: "Nee", meaning: "you" },
      {
        tamil: "நீங்கள்",
        roman: "Neengal",
        meaning: "you (plural/respect)",
      },
    ],
  },
  {
    id: "third",
    title: "படர்க்கை",
    subtitle: "பேசப்படுபவர்",
    color: "#a83b4c", // kumkum maroon
    tint: "#f7e6e9",
    words: [
      {
        tamil: "அவன்",
        roman: "Avan",
        meaning: "he",
      },
      {
        tamil: "அவள்",
        roman: "Aval",
        meaning: "she",
      },
      {
        tamil: "இவன்",
        roman: "Ivan",
        meaning: "he (nearby)",
      },
      {
        tamil: "இவள்",
        roman: "Ival",
        meaning: "she (nearby)",
      },
      {
        tamil: "அது",
        roman: "Adhu",
        meaning: "it / that",
      },
      {
        tamil: "இது",
        roman: "Idhu",
        meaning: "it / this",
      },
      {
        tamil: "அவர்கள்",
        roman: "Avargal",
        meaning: "they",
      },
    ],
  },
];

const ALL_WORDS = CATEGORIES.flatMap((c) => c.words);

// Splits Tamil text into individual letters (grapheme clusters), so a
// combining vowel sign like ெ stays attached to its consonant instead of
// being read as a separate broken sound. Falls back to a plain character
// split on very old browsers that lack Intl.Segmenter.
function splitTamilLetters(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("ta", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment).filter((c) =>
      c.trim(),
    );
  }
  return Array.from(text).filter((c) => c.trim());
}

const LETTER_PAUSE_MS = 280;

export default function TamilPronounceDemo() {
  const [openCategory, setOpenCategory] = useState(CATEGORIES[0].id);
  const [selected, setSelected] = useState(null); // word (with catId) or null
  const [heard, setHeard] = useState(() => new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingLetters, setIsPlayingLetters] = useState(false);
  const [playingLetterIndex, setPlayingLetterIndex] = useState(null);
  const [ttsError, setTtsError] = useState(null);
  const [typeText, setTypeText] = useState("");
  const [typeError, setTypeError] = useState(null);
  const [typePlaying, setTypePlaying] = useState(false);

  const overallPct = Math.round((heard.size / ALL_WORDS.length) * 100);

  // Dynamic: speaks whatever is in word.tamil right now, so editing that
  // text (word, plural, name — anything) automatically changes the voice
  // too, no separate audio file to update.
  const playWord = async (word) => {
    setTtsError(null);
    setIsPlaying(true);
    try {
      await speakTamil(word.tamil);
      setHeard((prev) => new Set(prev).add(word.roman));
    } catch (e) {
      console.error("TTS error:", e);
      setTtsError(
        "இந்த சாதனத்தில் தமிழ் குரல் இல்லை. Piper backend இணைக்கவும்.",
      );
    } finally {
      setIsPlaying(false);
    }
  };

  // Reads the word out one letter at a time, with a short pause between
  // each — for practising individual letter sounds before the whole word.
  const playWordLetters = async (word) => {
    setTtsError(null);
    setIsPlayingLetters(true);
    try {
      const letters = splitTamilLetters(word.tamil);
      for (const letter of letters) {
        await speakTamil(letter);
        await new Promise((resolve) => setTimeout(resolve, LETTER_PAUSE_MS));
      }
      setHeard((prev) => new Set(prev).add(word.roman));
    } catch (e) {
      console.error("TTS error:", e);
      setTtsError(
        "இந்த சாதனத்தில் தமிழ் குரல் இல்லை. Piper backend இணைக்கவும்.",
      );
    } finally {
      setIsPlayingLetters(false);
    }
  };


  // Plays just the one letter the user tapped inside its own container.
  const playLetter = async (word, letter, idx) => {
    setTtsError(null);
    setPlayingLetterIndex(idx);
    try {
      await speakTamil(letter);
      setHeard((prev) => new Set(prev).add(word.roman));
    } catch (e) {
      console.error("TTS error:", e);
      setTtsError(
        "இந்த சாதனத்தில் தமிழ் குரல் இல்லை. Piper backend இணைக்கவும்.",
      );
    } finally {
      setPlayingLetterIndex(null);
    }
  };

  // Free-typing box: speaks whatever Tamil text the user typed, live.
  const playTypedText = async () => {
    const text = typeText.trim();
    if (!text) return;
    setTypeError(null);
    setTypePlaying(true);
    try {
      await speakTamil(text);
    } catch (e) {
      console.error("TTS error:", e);
      setTypeError(
        "இந்த சாதனத்தில் தமிழ் குரல் இல்லை. Piper backend இணைக்கவும்.",
      );
    } finally {
      setTypePlaying(false);
    }
  };

  if (selected) {
    const cat = CATEGORIES.find((c) => c.id === selected.catId);
    return (
      <DetailScreen
        word={selected}
        cat={cat}
        isPlaying={isPlaying}
        playingLetterIndex={playingLetterIndex}
        ttsError={ttsError}
        onBack={() => setSelected(null)}
        onPlayWord={() => playWord(selected)}
        onPlayLetter={(letter, idx) => playLetter(selected, letter, idx)}
      />
    );
  }

  return (
    <div style={s.page}>
      <div style={s.shell}>
        <div style={s.header}>
          <KolamDots />
          <div style={s.headerInner}>
            <h1 style={s.headerTitle}>சொற்களைக் கற்கலாம்</h1>
            <p style={s.headerSub}>
              தமிழ் சுட்டுப்பெயர்களை கேட்டு, சொல்லிப் பழகுங்கள்.
            </p>
          </div>
        </div>

        <div style={s.typeCard}>
          <p style={s.typeLabel}>
            எந்த தமிழ் வார்த்தையும் தட்டச்சு செய்யுங்கள்
          </p>
          <div style={s.typeRow}>
            <input
              style={s.typeInput}
              type="text"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && playTypedText()}
              placeholder="இங்கே தமிழில் தட்டச்சு செய்யுங்கள்..."
            />
            <button
              style={{
                ...s.typeBtn,
                opacity: typeText.trim() ? 1 : 0.5,
              }}
              className={typePlaying ? "is-speaking" : ""}
              onClick={playTypedText}
              disabled={!typeText.trim() || typePlaying}
            >
              <Volume2 size={17} />
              {typePlaying ? "..." : "கேட்க"}
            </button>
          </div>
          {typeError && <p style={s.ttsError}>{typeError}</p>}
        </div>

        <div style={s.progressRow}>
          <div style={s.progressLabelRow}>
            <span style={s.progressLabel}>முன்னேற்றம்</span>
            <span style={s.progressPct}>{overallPct}%</span>
          </div>
          <div style={s.progressStrip}>
            {CATEGORIES.map((cat, i) => {
              const doneInCat = cat.words.filter((w) =>
                heard.has(w.roman),
              ).length;
              const catPct = (doneInCat / cat.words.length) * 100;
              return (
                <div
                  key={cat.id}
                  style={{ ...s.progressSeg, marginLeft: i === 0 ? 0 : 3 }}
                >
                  <div
                    style={{
                      ...s.progressSegFill,
                      width: `${catPct}%`,
                      background: cat.color,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const isOpen = openCategory === cat.id;
          const doneInCat = cat.words.filter((w) => heard.has(w.roman)).length;
          return (
            <div
              key={cat.id}
              style={{
                ...s.categoryCard,
                borderLeft: `4px solid ${cat.color}`,
              }}
            >
              <button
                style={s.categoryHeader}
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
              >
                <span style={s.categoryLabel}>
                  <PersonGlyph
                    color={cat.color}
                    count={cat.id === "first" ? 2 : 1}
                  />
                  <span>
                    <span style={s.categoryTitle}>{cat.title}</span>
                    <span style={s.categorySub}> · {cat.subtitle}</span>
                  </span>
                </span>
                <span style={s.categoryRight}>
                  <span style={{ ...s.categoryCount, color: cat.color }}>
                    {doneInCat}/{cat.words.length}
                  </span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {isOpen && (
                <div style={s.wordGrid}>
                  {cat.words.map((w) => {
                    const done = heard.has(w.roman);
                    return (
                      <button
                        key={w.roman}
                        style={{
                          ...s.wordTile,
                          borderTop: `3px solid ${cat.color}`,
                          ...(done ? { background: cat.tint } : {}),
                        }}
                        onClick={() => setSelected({ ...w, catId: cat.id })}
                      >
                        {w.tamil}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailScreen({
  word,
  cat,
  isPlaying,
  playingLetterIndex,
  ttsError,
  onBack,
  onPlayWord,
  onPlayLetter,
}) {
  const letters = splitTamilLetters(word.tamil);
  const anyPlaying = isPlaying || playingLetterIndex !== null;
  return (
    <div style={s.page}>
      <div style={s.shell}>
        <button style={{ ...s.linkBtn, color: cat.color }} onClick={onBack}>
          <ArrowLeft
            size={15}
            style={{ verticalAlign: "-2px", marginRight: 4 }}
          />
          பட்டியலுக்குத் திரும்பு
        </button>

        <div style={s.detailCard}>
          <div
            style={{
              ...s.detailIcon,
              background: cat.tint,
              color: cat.color,
              fontSize: word.tamil.length > 4 ? "1.8rem" : "3.2rem",
            }}
          >
            {word.tamil}
            <CornerDots color={cat.color} />
          </div>
          <span
            style={{ ...s.detailPill, background: cat.tint, color: cat.color }}
          >
            {cat.title}
          </span>
          <h1 style={s.detailTitle}>
            <span style={s.detailTitleBlue}>
              &lsquo;{word.tamil}&rsquo; சொல்லைக் கற்கலாம்.
            </span>
          </h1>
          <p style={s.detailDesc}>
            {word.roman} என்பது &ldquo;{word.meaning}&rdquo; என்று பொருள்படும்.
            பொத்தானை அழுத்தி உச்சரிப்பைக் கேளுங்கள்.
          </p>
          <p style={s.containerLabel}>எழுத்துக்களாகக் கேட்க · எழுத்தை அழுத்தவும்</p>
          <div style={s.lettersRow}>
            {letters.map((letter, idx) => {
              const active = playingLetterIndex === idx;
              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  style={{
                    ...s.letterBox,
                    borderColor: cat.color,
                    color: cat.color,
                    background: active ? cat.tint : "#fff",
                    opacity: anyPlaying && !active ? 0.5 : 1,
                    cursor: anyPlaying ? "default" : "pointer",
                  }}
                  className={active ? "is-speaking" : ""}
                  onClick={() => !anyPlaying && onPlayLetter(letter, idx)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !anyPlaying && onPlayLetter(letter, idx)
                  }
                >
                  {letter}
                </div>
              );
            })}
          </div>

          <p style={s.containerLabel}>முழு வார்த்தையாகக் கேட்க · வார்த்தையை அழுத்தவும்</p>
          <div
            role="button"
            tabIndex={0}
            style={{
              ...s.wordBox,
              borderColor: cat.color,
              color: cat.color,
              background: isPlaying ? cat.tint : "#fff",
              opacity: anyPlaying && !isPlaying ? 0.5 : 1,
              cursor: anyPlaying ? "default" : "pointer",
            }}
            className={isPlaying ? "is-speaking" : ""}
            onClick={() => !anyPlaying && onPlayWord()}
            onKeyDown={(e) => e.key === "Enter" && !anyPlaying && onPlayWord()}
          >
            {word.tamil}
          </div>

          {ttsError && <p style={s.ttsError}>{ttsError}</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Small decorative components ---------------------------------------
function PersonGlyph({ color, count }) {
  const figure = (x) => (
    <g key={x} transform={`translate(${x},0)`}>
      <circle cx="7" cy="4" r="3.2" fill={color} />
      <path d="M1.5 16c0-4 3-6.5 5.5-6.5S12.5 12 12.5 16" fill={color} />
    </g>
  );
  return (
    <svg
      width={count > 1 ? 22 : 14}
      height="18"
      viewBox={`0 0 ${count > 1 ? 22 : 14} 18`}
      style={{ flex: "none" }}
    >
      {count > 1 ? [figure(0), figure(8)] : figure(0)}
    </svg>
  );
}

function KolamDots() {
  const dots = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 14; col++) {
      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={col * 22 + 10}
          cy={row * 18 + 10}
          r="1.6"
          fill="#ffffff"
          opacity="0.35"
        />,
      );
    }
  }
  return (
    <svg style={s.kolamSvg} viewBox="0 0 320 60" preserveAspectRatio="none">
      {dots}
    </svg>
  );
}

function CornerDots({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={s.cornerDots}>
      <circle cx="4" cy="4" r="2" fill={color} opacity="0.5" />
      <circle cx="14" cy="4" r="1.4" fill={color} opacity="0.35" />
      <circle cx="4" cy="14" r="1.4" fill={color} opacity="0.35" />
    </svg>
  );
}

// ---- STYLES -------------------------------------------------------------
const ink = "#2c1d24";
const sub = "#7d6f78";
const cream = "#faf5ec";
const cardLine = "#ece3d6";

const s = {
  page: {
    minHeight: "100%",
    background: cream,
    color: ink,
    fontFamily: '"Noto Sans Tamil", "Segoe UI", system-ui, sans-serif',
    display: "flex",
    justifyContent: "center",
    padding: "0 16px 48px",
  },
  shell: {
    width: "100%",
    maxWidth: 620,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  header: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #7a3b57, #4f2740)",
    borderRadius: "0 0 28px 28px",
    margin: "0 -16px",
    padding: "34px 24px 26px",
  },
  kolamSvg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  headerInner: { position: "relative", textAlign: "center" },
  headerTitle: { color: "#fff", fontSize: "1.5rem", margin: "0 0 6px" },
  headerSub: { color: "rgba(255,255,255,.82)", fontSize: ".9rem", margin: 0 },

  typeCard: {
    background: "#fff",
    border: `1px solid ${cardLine}`,
    borderRadius: 18,
    padding: "16px 18px",
  },
  typeLabel: { fontWeight: 700, fontSize: ".85rem", margin: "0 0 10px" },
  typeRow: { display: "flex", gap: 8 },
  typeInput: {
    flex: 1,
    border: `1px solid ${cardLine}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: "1.05rem",
    fontFamily: "inherit",
    color: ink,
    background: cream,
  },
  typeBtn: {
    border: "none",
    background: "#7a3b57",
    color: "#fff",
    fontWeight: 700,
    fontSize: ".85rem",
    borderRadius: 12,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  progressRow: {
    background: "#fff",
    border: `1px solid ${cardLine}`,
    borderRadius: 18,
    padding: "14px 18px",
  },
  progressLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { fontWeight: 700, fontSize: ".88rem" },
  progressPct: { fontWeight: 700, fontSize: ".88rem", color: "#7a3b57" },
  progressStrip: { display: "flex", height: 8 },
  progressSeg: {
    flex: 1,
    background: "#f1ebe0",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressSegFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width .3s ease",
  },

  categoryCard: {
    background: "#fff",
    border: `1px solid ${cardLine}`,
    borderRadius: 16,
    overflow: "hidden",
  },
  categoryHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "none",
    background: "transparent",
    padding: "14px 16px",
    cursor: "pointer",
    color: ink,
    fontFamily: "inherit",
  },
  categoryLabel: { display: "flex", alignItems: "center", gap: 10 },
  categoryTitle: { fontWeight: 700, fontSize: ".98rem" },
  categorySub: { color: sub, fontSize: ".8rem" },
  categoryRight: { display: "flex", alignItems: "center", gap: 10 },
  categoryCount: { fontWeight: 700, fontSize: ".78rem" },

  wordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
    gap: 10,
    padding: "0 16px 16px",
  },
  wordTile: {
    border: `1px solid ${cardLine}`,
    background: "#fffdf9",
    borderRadius: "6px 6px 14px 14px",
    padding: "14px 8px",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: ink,
    cursor: "pointer",
  },

  linkBtn: {
    border: "none",
    background: "transparent",
    fontWeight: 700,
    fontSize: ".85rem",
    cursor: "pointer",
    padding: "6px 0",
  },
  detailCard: {
    background: "#fff",
    border: `1px solid ${cardLine}`,
    borderRadius: 24,
    padding: "36px 28px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    position: "relative",
    minWidth: 132,
    minHeight: 132,
    maxWidth: "100%",
    borderRadius: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 22px",
    fontWeight: 800,
    marginBottom: 4,
    whiteSpace: "nowrap",
  },
  cornerDots: { position: "absolute", top: 6, right: 6 },
  detailPill: {
    fontSize: ".75rem",
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
  },
  detailTitle: { fontSize: "1.35rem", margin: 0, lineHeight: 1.4 },
  detailTitleBlue: { color: "#1d5fbf" },
  ttsError: {
    color: "#a83b4c",
    fontSize: ".78rem",
    margin: "4px 0 0",
    maxWidth: 320,
    textAlign: "center",
  },
  detailDesc: {
    color: sub,
    fontSize: ".9rem",
    lineHeight: 1.6,
    maxWidth: 400,
    margin: 0,
  },
  containerLabel: {
    fontWeight: 700,
    fontSize: ".78rem",
    color: sub,
    margin: "10px 0 0",
  },
  lettersRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    width: "100%",
  },
  letterBox: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 12,
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: 700,
    padding: "6px 10px",
    userSelect: "none",
    transition: "background .15s ease, opacity .15s ease",
  },
  wordBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: "1.6rem",
    fontWeight: 700,
    padding: "14px 20px",
    userSelect: "none",
    transition: "background .15s ease, opacity .15s ease",
  },
  listenBtn: {
    marginTop: 6,
    border: "none",
    color: "#fff",
    fontWeight: 700,
    fontSize: ".92rem",
    padding: "12px 20px",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    transition: "box-shadow .2s ease",
    flex: "1 1 auto",
    whiteSpace: "nowrap",
  },
  btnRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
};
