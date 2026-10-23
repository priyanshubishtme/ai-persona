"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Props = { text: string; label: string; icon?: ReactNode; onAnnounce: (message: string) => void };

export function CopyButton({ text, label, icon, onAnnounce }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onAnnounce(`${label}: copied to clipboard.`);
    } catch {
      onAnnounce(`${label}: your browser blocked clipboard access. Select the text and copy it manually.`);
    }
  }

  return (
    <button type="button" className="btn-quiet" onClick={copy}>
      {copied ? <Check aria-hidden className="size-4 text-added" /> : (icon ?? <Copy aria-hidden className="size-4" />)}
      {copied ? "Copied" : label}
    </button>
  );
}
