"use client";

/**
 * All spoken audio in the app uses an Indian English voice.
 *
 * "Rishi" is the male en-IN voice macOS ships; the rest of the chain is there
 * so a machine without it still speaks rather than going silent.
 */

let cache: SpeechSynthesisVoice[] = [];
let wired = false;
let ready: Promise<void> | null = null;

function refresh() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cache = window.speechSynthesis.getVoices();
}

export function initTts() {
  if (typeof window === "undefined" || !window.speechSynthesis || wired) return;
  wired = true;
  refresh();
  window.speechSynthesis.addEventListener("voiceschanged", refresh);
  void voicesReady();
}

/**
 * getVoices() is empty on first load in every browser and fills in
 * asynchronously — sometimes without ever firing voiceschanged. Speaking
 * before it fills leaves utterance.voice unset, and the browser falls back to
 * its own default voice. So every speak() waits on this first.
 */
function voicesReady(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    refresh();
    if (cache.length) return resolve();

    const finish = () => {
      refresh();
      if (!cache.length) return;
      cleanup();
      resolve();
    };
    const poll = setInterval(finish, 100);
    const giveUp = setTimeout(() => {
      cleanup();
      resolve();
    }, 5000);
    function cleanup() {
      clearInterval(poll);
      clearTimeout(giveUp);
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
    }
    window.speechSynthesis.addEventListener("voiceschanged", finish);
  });
  return ready;
}

export function whenVoicesReady() {
  return voicesReady();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!cache.length) refresh();
  if (!cache.length) return null;

  // Male en-IN first, then any en-IN, then any other Indian-locale voice.
  // Names vary by platform: Rishi on macOS, Prabhat/Madhur on Windows and
  // Edge, "Google हिन्दी" on Chrome, plus "... - English (India)" variants.
  const MALE = /rishi|ravi|prabhat|hemant|arjun|aditya|madhur|kunal/i;

  const rishi = cache.find((v) => /^rishi/i.test(v.name));
  if (rishi) return rishi;

  const maleEnIn = cache.find(
    (v) => (/en[-_]IN/i.test(v.lang) || /english \(india\)/i.test(v.name)) && MALE.test(v.name),
  );
  if (maleEnIn) return maleEnIn;

  const enIn = cache.find((v) => /en[-_]IN/i.test(v.lang) || /english \(india\)/i.test(v.name));
  if (enIn) return enIn;

  const anyIndian = cache.find((v) => /[-_]IN$/i.test(v.lang) || /india|hindi/i.test(v.name));
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
  // Cancel straight away so a rapid second click stops the first utterance,
  // then wait for the voice list before actually speaking.
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* no-op */
  }
  const token = ++speakToken;
  void voicesReady().then(() => {
    // A newer speak() superseded this one while we were waiting.
    if (token !== speakToken) return;
    try {
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
  });
}

let speakToken = 0;
