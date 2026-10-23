import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MAX_BODY_BYTES, MAX_INPUT_CHARS } from "@/lib/contract";
import { WORDS_PER_MINUTE } from "@/lib/format";
import { SHORT_TEXT_WORDS } from "@/lib/metrics";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Alter counts words, estimates sentiment and readability, measures phrase overlap and runs Fact Guard.",
};

const SECTIONS = [
  { id: "words", title: "Words and reading time" },
  { id: "sentiment", title: "Sentiment" },
  { id: "readability", title: "Readability" },
  { id: "overlap", title: "Phrase overlap" },
  { id: "changes", title: "Changes and rounding" },
  { id: "fact-guard", title: "Fact Guard" },
  { id: "diff", title: "Change highlighting" },
  { id: "limits", title: "Limits and languages" },
  { id: "privacy", title: "Privacy and AI processing" },
  { id: "demo", title: "Demo mode" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="pt-14">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="overflow-x-auto rounded-xl bg-surface px-4 py-3 font-mono text-sm text-ink">
      <code>{children}</code>
    </p>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
      <nav aria-label="On this page" className="hidden lg:block">
        <ul className="sticky top-24 space-y-2 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-[68ch]">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          How Alter measures a rewrite
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          The AI writes the rewrite. Everything else is computed by Alter&apos;s own code, the same way for your draft and
          for the rewrite, so the numbers can be compared. None of them are produced by asking the model.
        </p>

        <Section id="words" title="Words and reading time">
          <p>
            Text is normalized to Unicode NFKC and curly apostrophes are straightened. A <strong>word</strong> is a run of
            letters, accent marks or digits, optionally joined by apostrophes, so &ldquo;don&apos;t&rdquo; and
            &ldquo;Priya&apos;s&rdquo; are one word each. Hyphens split words (&ldquo;follow-up&rdquo; is two).
            Punctuation, emoji, line breaks and bullet markers are not words.
          </p>
          <p>
            <strong>Reading time</strong> is the word count divided by {WORDS_PER_MINUTE} words per minute, a common
            estimate of adult silent reading speed. It is a rough guide, not a measurement of any particular reader.
          </p>
        </Section>

        <Section id="sentiment" title="Sentiment">
          <p>
            Sentiment uses <strong>VADER</strong> (Hutto and Gilbert, 2014), a rule-based model with a lexicon of about
            7,500 rated words that accounts for negation, intensifiers such as &ldquo;very&rdquo;, capitals and
            exclamation marks. Alter uses the official JavaScript port (Apache 2.0, Comcast) unchanged.
          </p>
          <p>
            Each sentence gets a compound score from −1 (most negative) to +1 (most positive). The text&apos;s score is
            the average across its sentences. An empty text scores 0.
          </p>
          <p>
            Treat it as an <strong>estimate</strong>. VADER was built for short English social text. It misses sarcasm
            and context, and it does not score emoji.
          </p>
        </Section>

        <Section id="readability" title="Readability">
          <p>
            Readability is the <strong>Flesch Reading Ease</strong> score. Higher is easier: around 60 to 70 reads as
            plain English, below 30 is dense.
          </p>
          <Formula>206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words)</Formula>
          <p>
            A sentence ends at a full stop, question mark or exclamation mark followed by a space, or at a line break, so
            each bullet counts as a sentence. Decimals such as 3.5 do not end a sentence.
          </p>
          <p>
            Syllables are <strong>estimated</strong>: words of three letters or fewer count as one; a silent final
            &ldquo;e&rdquo;, &ldquo;es&rdquo; or &ldquo;ed&rdquo; is dropped (but not &ldquo;le&rdquo;, and not in words
            like &ldquo;boxes&rdquo; or &ldquo;wanted&rdquo;); then groups of vowels (a, e, i, o, u, y) are counted, with
            a minimum of one. Numbers count as one syllable.
          </p>
          <p>
            Scores can fall <strong>outside 0 to 100</strong>, and they are unreliable for very short texts: under{" "}
            {SHORT_TEXT_WORDS} words, Alter shows a warning. An empty text scores 0.
          </p>
        </Section>

        <Section id="overlap" title="Phrase overlap">
          <p>
            Phrase overlap shows how much of the original phrasing survives. Both texts are lowercased and split into
            words as described above, which removes punctuation, so punctuation never separates two words. Alter then
            collects the set of unique <strong>word pairs</strong> (bigrams) in each text.
          </p>
          <Formula>overlap = |pairs in both| ÷ |pairs in either| × 100</Formula>
          <p>
            This is the Jaccard similarity of the two sets. 100% means the same word pairs; 0% means none in common. If
            neither text has at least two words, there are no pairs: Alter reports 0 and labels the overlap as not
            meaningful.
          </p>
        </Section>

        <Section id="changes" title="Changes and rounding">
          <p>
            Every change is <strong>rewrite minus draft</strong>, computed from unrounded values. Numbers are rounded only
            for display: sentiment to two decimals, readability to one, overlap to a whole percent. The JSON you copy
            keeps the unrounded values. Every value is checked to be a finite number before it is sent.
          </p>
        </Section>

        <Section id="fact-guard" title="Fact Guard">
          <p>After each rewrite, Fact Guard looks in your draft for:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>numbers, including decimals, percentages, money amounts and shorthand such as 5k</li>
            <li>number words (zero, and two to twenty), matched against digits so three equals 3. &ldquo;One&rdquo; is skipped because it is usually not a quantity</li>
            <li>month names, weekdays and ISO dates such as 2026-03-07</li>
            <li>capitalized names that are not at the start of a sentence</li>
            <li>negations such as not, never, no, without, unless and words ending in n&apos;t</li>
          </ul>
          <p>
            Anything that does not appear in the rewrite is listed as a <strong>possible</strong> dropped detail.
            Numbers match by value, so $48,000 and $48k count as the same. If the draft has a negation and the rewrite
            has none, Fact Guard warns that the meaning may have flipped.
          </p>
          <p>
            These are pattern checks, not understanding. Fact Guard can miss names at the start of a sentence or written
            in lowercase, and it can flag details that were rephrased correctly. Alter warns and never rewrites again by
            itself.
          </p>
        </Section>

        <Section id="diff" title="Change highlighting">
          <p>
            Show changes compares the draft and the rewrite word by word and marks removed words with a strikethrough and
            added words with an underline. It is a visual aid only and is calculated separately from the phrase overlap
            percentage.
          </p>
        </Section>

        <Section id="limits" title="Limits and languages">
          <p>
            A draft can be up to <strong>{MAX_INPUT_CHARS.toLocaleString("en-US")} characters</strong>, and a request up
            to {MAX_BODY_BYTES / 1024} KB. Each address can send 40 rewrite requests a minute (the all-four option sends
            four). This limit is kept in server memory: on serverless hosting each instance counts separately and counts
            reset on restart, so it is light protection, not a guarantee.
          </p>
          <p>
            Each AI attempt has 12 seconds, and all attempts together have 25 seconds. If the first provider fails,
            Alter tries the next one configured.
          </p>
          <p>
            You can write in any language and the rewrite keeps it. Sentiment, readability and syllable estimates are
            built for English, so when most letters in a draft are not Latin script Alter warns that those numbers are
            unreliable. Word counts treat an unbroken run of Chinese or Japanese characters as one word.
          </p>
        </Section>

        <Section id="privacy" title="Privacy and AI processing">
          <p>
            Alter does not store drafts or rewrites and does not write them to its logs. Logs record only whether a
            request succeeded, which provider answered and how long it took.
          </p>
          <p>
            To be rewritten, your draft is sent to the configured AI provider (Google Gemini, or an OpenAI-compatible
            service). That provider&apos;s terms decide what it keeps. Free tiers, including Gemini&apos;s, may keep
            submitted text and use it to improve their products. Don&apos;t paste confidential material when running on
            a free key.
          </p>
          <p>
            Text in your draft is treated as content to rewrite, never as instructions, and everything is shown as plain
            text, never as HTML.
          </p>
        </Section>

        <Section id="demo" title="Demo mode">
          <p>
            Without an API key, Alter runs in demo mode. Only the three built-in examples work, and their rewrites were
            written by hand in advance, so they are labeled &ldquo;Demo · written by hand, not AI&rdquo;. The metrics and
            Fact Guard still run for real on those rewrites. Any other draft gets a message that live AI is not
            configured.
          </p>
        </Section>

        <p className="mt-16">
          <Link href="/#studio" className="btn-primary">
            Back to the studio
          </Link>
        </p>
      </article>
    </div>
  );
}
