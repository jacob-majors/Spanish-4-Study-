"use client";

export type VoiceMode = "indian" | "spanish";

const KEY = "sa.voice";
const DEFAULT_MODE: VoiceMode = "indian";

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

export function getVoiceMode(): VoiceMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const v = localStorage.getItem(KEY);
    return v === "spanish" || v === "indian" ? v : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function setVoiceMode(mode: VoiceMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* private mode */
  }
}

/**
 * Indian English, male first. "Rishi" is the male en-IN voice macOS ships;
 * everything after it is a fallback for machines that don't have it.
 */
function pickIndian(): SpeechSynthesisVoice | null {
  const byName = cache.find((v) => /^rishi/i.test(v.name));
  if (byName) return byName;
  const maleish = cache.find(
    (v) => /en-IN/i.test(v.lang) && /rishi|ravi|prabhat|hemant|arjun/i.test(v.name),
  );
  if (maleish) return maleish;
  const enIN = cache.find((v) => /en-IN/i.test(v.lang));
  if (enIN) return enIN;
  const anyIN = cache.find((v) => /-IN$/i.test(v.lang));
  return anyIN ?? null;
}

/** Latin American Spanish first — that's what most US classrooms model. */
function pickSpanish(): SpeechSynthesisVoice | null {
  const es = cache.filter((v) => v.lang.toLowerCase().startsWith("es"));
  return (
    es.find((v) => /es-MX|es-US|es_419/i.test(v.lang)) ??
    es.find((v) => /es-ES/i.test(v.lang)) ??
    es[0] ??
    null
  );
}

function resolve(mode: VoiceMode): SpeechSynthesisVoice | null {
  if (!cache.length) refresh();
  // If the preferred voice is not installed, fall back to the other one so
  // audio still works rather than going silent.
  return mode === "indian" ? pickIndian() ?? pickSpanish() : pickSpanish() ?? pickIndian();
}

export function currentVoice(): SpeechSynthesisVoice | null {
  initTts();
  return resolve(getVoiceMode());
}

/** What the colophon shows, e.g. "Rishi · en-IN". */
export function currentVoiceLabel(): string {
  const v = currentVoice();
  return v ? `${v.name} · ${v.lang}` : "system default";
}

export function hasSpanishVoice(): boolean {
  initTts();
  return !!pickSpanish();
}

/** Read a term aloud in whichever voice is selected. */
export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  initTts();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = resolve(getVoiceMode());
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
