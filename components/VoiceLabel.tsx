"use client";

import { useEffect, useState } from "react";
import { currentVoiceLabel } from "@/lib/tts";

/** Names the voice actually in use — a colophon records its production. */
export default function VoiceLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    // Voices populate asynchronously, and some browsers never fire
    // voiceschanged — listen for it and poll briefly as a backstop.
    let tries = 0;
    const read = () => {
      const l = currentVoiceLabel();
      if (l !== "system default") setLabel(l);
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

  return <> Audio en inglés de India{label && <span> ({label})</span>}.</>;
}
