import type { PersonaId } from "@/lib/contract";

export type Preset = {
  id: string;
  label: string;
  draft: string;
  /** Hand-written rewrites served only in demo mode, always labeled as not AI. */
  demo: Record<PersonaId, string>;
};

export const PRESETS: Preset[] = [
  {
    id: "launch",
    label: "Launch delay",
    draft:
      "hey guys — pushing launch to friday, few things to fix before we go live. the checkout bug is still not fixed and QA needs 2 more days. release notes are with Priya, ping her if anything changes.",
    demo: {
      c_level:
        "Launch moves to Friday. The checkout bug is not yet fixed, and QA needs 2 more days before we go live. Release notes are with Priya; flag any changes to her.",
      peer_feedback:
        "Hi team, quick heads-up: we're moving launch to Friday so we can fix a few things before we go live. The checkout bug still isn't fixed, and QA needs 2 more days. Priya has the release notes, so if anything changes, please let her know. Thanks, everyone.",
      legal_compliance:
        "The launch is rescheduled to Friday to allow several outstanding items to be fixed before go-live. The checkout defect has not yet been fixed, and quality assurance (QA) requires 2 additional days.\n\nPriya is responsible for the release notes. Any changes should be communicated to her.",
      gen_z:
        "launch moved to friday 🚀 few things to fix before we go live. checkout bug? still not fixed. QA needs 2 more days. release notes = Priya, ping her if anything changes 🙏",
    },
  },
  {
    id: "frustrated",
    label: "Frustrated message",
    draft:
      "honestly this is the third time the client report went out with wrong numbers. revenue was $48k, not $84k. i can't keep catching this at 11pm. from now on every report needs a second reviewer before it goes to Northwind.",
    demo: {
      c_level:
        "- The client report has gone out with wrong figures three times; revenue was $48k, not $84k.\n- Errors are being caught late, at 11pm, and that cannot continue.\n- Decision: from now on, every report needs a second reviewer before it goes to Northwind.",
      peer_feedback:
        "Hey, I want to flag something: this is the third time the client report has gone out with wrong numbers. Revenue was $48k, not $84k. I can't keep catching these at 11pm, so from now on I'd like every report to have a second reviewer before it goes to Northwind. Could we set that up together?",
      legal_compliance:
        "The client report has been issued with incorrect figures on three occasions. In this instance, revenue was stated as $84k; the correct figure was $48k. Errors of this kind cannot continue to be corrected at 11pm.\n\nEffective immediately, each report must be checked by a second reviewer before it is sent to Northwind.",
      gen_z:
        "ok real talk: third time the client report went out with wrong numbers 😬 revenue was $48k, NOT $84k. i can't keep catching this at 11pm. new rule: every report gets a second reviewer before it goes to Northwind ✅",
    },
  },
  {
    id: "leave",
    label: "Leave request",
    draft:
      "hi, i need to take leave from march 3 to march 7 for a family wedding. i'll finish the onboarding docs before i go, and Arjun said he might cover support tickets, but i haven't confirmed with him yet.",
    demo: {
      c_level:
        "I am requesting leave from March 3 to March 7 for a family wedding. I will finish the onboarding docs before I go. Arjun may cover support tickets, but I have not confirmed this with him yet.",
      peer_feedback:
        "Hi! I need to take leave from March 3 to March 7 for a family wedding. I'll finish the onboarding docs before I go. Arjun mentioned he might cover support tickets, but I haven't confirmed with him yet.",
      legal_compliance:
        "The employee requests leave from March 3 to March 7 to attend a family wedding. The employee will complete the onboarding documentation before the leave period begins.\n\nArjun has indicated that he may cover support tickets; however, this arrangement has not yet been confirmed.",
      gen_z:
        "heads up: i'm off march 3 to march 7 for a family wedding 💍 onboarding docs will be done before i go. Arjun might cover support tickets, but i haven't locked that in with him yet 🤞",
    },
  },
];

function normaliseForMatch(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function findPresetByDraft(draft: string): Preset | undefined {
  const key = normaliseForMatch(draft);
  return PRESETS.find((p) => normaliseForMatch(p.draft) === key);
}
