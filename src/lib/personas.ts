import type { PersonaId } from "@/lib/contract";

export type Persona = {
  id: PersonaId;
  name: string;
  audience: string;
  summary: string;
  rules: string[];
};

export const PERSONAS: Persona[] = [
  {
    id: "c_level",
    name: "C-Level",
    audience: "Executives",
    summary: "Two to four crisp sentences or exactly three bullets: outcomes, risks, decisions, next steps.",
    rules: [
      "Write either 2 to 4 crisp sentences or exactly 3 bullet points starting with \"- \". Choose whichever fits the content.",
      "Lead with outcomes, risks, decisions needed and next steps that the draft actually contains.",
      "No slang, no emotional language, no unnecessary background, no technical jargon.",
    ],
  },
  {
    id: "peer_feedback",
    name: "Peer feedback",
    audience: "Colleagues",
    summary: "A short, warm, respectful note with specific, actionable suggestions.",
    rules: [
      "Write a short, warm, respectful colleague-to-colleague message.",
      "Be encouraging, and offer specific, actionable suggestions only where the draft supports them.",
      "Use \"I\" and \"we\" naturally, but never invent personal experiences, feelings or commitments the draft does not state.",
    ],
  },
  {
    id: "legal_compliance",
    name: "Legal notice",
    audience: "Compliance readers",
    summary: "Neutral, precise, formal paragraphs that keep every obligation, condition and timeline.",
    rules: [
      "Write neutral, precise, formal paragraphs.",
      "Preserve every obligation, condition, exception and timeline exactly as stated.",
      "Never introduce legal requirements, warranties, guarantees or liabilities that are absent from the draft.",
      "Do not add a disclaimer; the application labels the output separately.",
    ],
  },
  {
    id: "gen_z",
    name: "Gen-Z hype",
    audience: "Social feeds",
    summary: "Energetic, informal, short sentences, with light slang or emoji where it fits.",
    rules: [
      "Write energetic, informal, social-friendly text with short sentences.",
      "Light slang or a few emoji are optional; keep it readable and never offensive.",
      "Keep every qualification and caveat. Do not inflate claims or add hype the draft does not support.",
    ],
  },
];

export function getPersona(id: PersonaId): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}
