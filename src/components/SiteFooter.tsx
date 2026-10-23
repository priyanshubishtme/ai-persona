import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto]">
        <div className="max-w-xl space-y-4">
          <Wordmark />
          <p className="text-sm leading-relaxed text-muted">
            Alter is a writing aid. Rewrites can be wrong, so read them before you send them. The legal notice style is
            not legal advice.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Drafts are sent to the configured AI provider to be rewritten. Alter does not store or log them. Free-tier AI
            providers may keep and use submitted text under their own terms, so don&apos;t paste confidential material
            when running on a free key.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <Link href="/#studio" className="text-ink underline-offset-4 hover:underline">
            Studio
          </Link>
          <Link href="/#platform" className="text-ink underline-offset-4 hover:underline">
            Platform
          </Link>
          <Link href="/methodology" className="text-ink underline-offset-4 hover:underline">
            Methodology
          </Link>
        </nav>
      </div>
    </footer>
  );
}
