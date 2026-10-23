import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureCards } from "@/components/FeatureCards";
import { HeroStack } from "@/components/HeroStack";
import { Studio } from "@/components/studio/Studio";
import { isLiveConfigured } from "@/lib/ai/config";
import { MAX_INPUT_CHARS } from "@/lib/contract";

const FACTS = [
  { value: "4", label: "audiences from one draft" },
  { value: "10", label: "metrics measured by code, not guessed by the AI" },
  { value: "0", label: "drafts stored or logged by Alter" },
  { value: MAX_INPUT_CHARS.toLocaleString("en-US"), label: "characters per draft" },
];

export default function Home() {
  const live = isLiveConfigured(process.env);

  return (
    <>
      <section className="relative overflow-hidden px-5 pb-24 pt-20 sm:px-8 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,90,31,0.18),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-[clamp(2.75rem,7.5vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-ink">
            One draft. <span className="font-serif font-normal italic tracking-[-0.01em] text-accent">Every audience.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted">
            Alter rewrites one rough message for an executive, a colleague, a compliance reader and a social feed. It keeps
            your facts, shows every change, and measures the difference with methods you can check.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="#studio" className="btn-primary">
              Start rewriting
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href="/methodology" className="btn-secondary">
              How the numbers work
            </Link>
          </div>
        </div>
        <HeroStack />
      </section>

      <section id="studio" aria-labelledby="studio-heading" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="studio-heading" className="text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Don&apos;t take our word for it. Rewrite something.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Paste a draft, pick who it&apos;s for, and turn on Show changes to see exactly what moved. Nothing is
              stored.
            </p>
          </div>
          <div className="mt-12">
            <Studio live={live} />
          </div>
        </div>
      </section>

      <section id="platform" aria-labelledby="platform-heading" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="platform-heading" className="max-w-3xl text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Built for the messages that matter most.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Every feature keeps you the author. Alter shows its work so you can check a rewrite before it goes out.
          </p>
          <FeatureCards />

          <dl className="mt-16 grid overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-4 [&>div]:bg-surface gap-px">
            {FACTS.map((fact) => (
              <div key={fact.label} className="p-6 sm:p-8">
                <dt className="sr-only">{fact.label}</dt>
                <dd className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">
                  {fact.value}
                </dd>
                <dd aria-hidden className="mt-3 text-sm leading-snug text-muted">
                  {fact.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="method-heading" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="method-heading" className="sr-only">
            How Alter measures
          </h2>
          <p className="font-serif text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.15] text-ink">
            Every number here comes from code you can read, not from the model that wrote the text.
          </p>
          <Link
            href="/methodology"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-accent-soft underline-offset-4 hover:underline"
          >
            Read how each metric works
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="px-5 pt-10 sm:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-surface px-6 py-20 text-center shadow-[inset_0_0_0_1px_var(--color-line)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(255,90,31,0.22),transparent_70%)]"
          />
          <div className="relative">
            <h2 id="cta-heading" className="mx-auto max-w-xl text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Say it once. Land it everywhere.
            </h2>
            <p className="mt-5 text-base text-muted">
              Paste a draft, pick an audience, and check every change before you send it.
            </p>
            <Link href="#studio" className="btn-primary mt-8">
              Open the studio
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
