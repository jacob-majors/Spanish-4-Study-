"use client";

let voice: SpeechSynthesisVoice | null = null;
let ready = false;

function pickVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const spanish = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
  // Prefer a Latin American voice, which is what most US classrooms model.
  return (
    spanish.find((v) => /es-MX|es-US|es_419/i.test(v.lang)) ??
    spanish.find((v) => /es-ES/i.test(v.lang)) ??
    spanish[0] ??
    null
  );
}

export function initTts() {
  if (typeof window === "undefined" || !window.speechSynthesis || ready) return;
  ready = true;
  voice = pickVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    voice = pickVoice();
  });
}

export function hasSpanishVoice(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  if (!voice) voice = pickVoice();
  return !!voice;
}

/** Read Spanish text aloud. No-ops silently where speech synthesis is unavailable. */
export function speak(text: string, rate = 0.92) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  initTts();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voice) voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "es-ES";
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch {
    /* speech is a nice-to-have */
  }
}
