"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/** Reads the rewrite aloud with the browser's built-in speech synthesis. Nothing leaves the device. */
export function ListenButton({ text }: { text: string }) {
  const supported = useSyncExternalStore(
    noop,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button type="button" className="btn-quiet" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square aria-hidden className="size-4" /> : <Volume2 aria-hidden className="size-4" />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
