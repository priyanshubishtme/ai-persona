import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start px-5 py-32 sm:px-8">
      <p className="text-sm font-medium text-accent-soft">404</p>
      <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-5 text-base leading-relaxed text-muted">
        The address may be mistyped, or the page may have moved. The studio and the methodology are the only two pages.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          Back to Alter
          <ArrowRight aria-hidden className="size-4" />
        </Link>
        <Link href="/methodology" className="btn-secondary">
          Methodology
        </Link>
      </div>
    </section>
  );
}
