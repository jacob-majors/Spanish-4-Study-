"use client";

/**
 * All spoken audio in the app uses an Indian English voice.
 *
 * "Rishi" is the male en-IN voice macOS ships; the rest of the chain is there
 * so a machine without it still speaks rather than going silent.
 */

let cache: SpeechSynthesisVoice[] = [];
let wired = false;

function refresh() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cache = window.speechSynthesis.getVoices();
}

export function initTts() {
  if (typeof window === "undefined" || !window.speechSynthesis || wired) return;
  wired = true;
  refresh();
  window.speechSynthesis.addEventListener("voiceschanged", refresh);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!cache.length) refresh();
  if (!cache.length) return null;

  // Male en-IN first, then any en-IN, then any other Indian-locale voice.
  const rishi = cache.find((v) => /^rishi/i.test(v.name));
  if (rishi) return rishi;

  const maleEnIn = cache.find(
    (v) => /en-IN/i.test(v.lang) && /rishi|ravi|prabhat|hemant|arjun|aditya/i.test(v.name),
  );
  if (maleEnIn) return maleEnIn;

  const enIn = cache.find((v) => /en-IN/i.test(v.lang));
  if (enIn) return enIn;

  const anyIndian = cache.find((v) => /-IN$/i.test(v.lang));
  if (anyIndian) return anyIndian;

  // Nothing Indian installed — speak with whatever English voice exists rather
  // than silently doing nothing.
  return cache.find((v) => /^en/i.test(v.lang)) ?? cache[0] ?? null;
}

export function currentVoice(): SpeechSynthesisVoice | null {
  initTts();
  return pickVoice();
}

/** What the colophon prints, e.g. "Rishi · en-IN". */
export function currentVoiceLabel(): string {
  const v = currentVoice();
  return v ? `${v.name} · ${v.lang}` : "system default";
}

/** Read a term aloud. */
export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  initTts();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch {
    /* speech is a nice-to-have */
  }
}
