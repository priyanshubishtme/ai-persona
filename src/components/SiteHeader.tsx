import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-ground/90 backdrop-blur-sm">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="rounded-md">
          <Wordmark />
          <span className="sr-only">, home</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/#platform" className="btn-quiet hidden sm:inline-flex">
            Platform
          </Link>
          <Link href="/methodology" className="btn-quiet">
            Methodology
          </Link>
          <Link href="/#studio" className="btn-primary min-h-10 px-4 text-sm">
            Open the studio
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
