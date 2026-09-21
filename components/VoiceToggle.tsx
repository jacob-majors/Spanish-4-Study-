"use client";

import { useEffect, useState } from "react";
import { getVoiceMode, setVoiceMode, currentVoiceLabel, speak, VoiceMode } from "@/lib/tts";

/**
 * Lives in the colophon, where a publication records how it was produced.
 * Switching re-reads a sample so you hear the change immediately.
 */
export default function VoiceToggle() {
  const [mode, setMode] = useState<VoiceMode>("indian");
  const [label, setLabel] = useState("");

  useEffect(() => {
    setMode(getVoiceMode());
    // Voices populate asynchronously, and some browsers never fire
    // voiceschanged — so listen for it and poll briefly as a backstop.
    let tries = 0;
    const read = () => {
      const l = currentVoiceLabel();
      setLabel(l);
      return l !== "system default";
    };
    if (read()) return;
    const iv = setInterval(() => {
      if (read() || ++tries > 20) clearInterval(iv);
    }, 150);
    const onChange = () => read();
    window.speechSynthesis?.addEventListener("voiceschanged", onChange);
    return () => {
      clearInterval(iv);
      window.speechSynthesis?.removeEventListener("voiceschanged", onChange);
    };
  }, []);

  function flip() {
    const next: VoiceMode = mode === "indian" ? "spanish" : "indian";
    setVoiceMode(next);
    setMode(next);
    setLabel(currentVoiceLabel());
    speak("el desarrollo");
  }

  return (
    <>
      {" "}Voz: {mode === "indian" ? "inglés de India" : "español"}
      {label && <span> ({label})</span>}.{" "}
      <button
        onClick={flip}
        className="link"
        style={{ font: "inherit", letterSpacing: "inherit", cursor: "pointer", color: "var(--color-accent)" }}
      >
        cambiar a {mode === "indian" ? "español" : "inglés de India"}
      </button>
      .
    </>
  );
}
