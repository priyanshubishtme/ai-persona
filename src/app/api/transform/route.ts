import { providersFromEnv } from "@/lib/ai/config";
import { createRateLimiter } from "@/lib/rateLimit";
import { handleTransform, methodNotAllowed } from "@/lib/transform";

export const maxDuration = 30;

// 40 per minute per IP: ten "all four personas" runs, each of which sends four requests.
const rateLimiter = createRateLimiter({ limit: 40, windowMs: 60_000 });

export async function POST(request: Request) {
  return handleTransform(request, {
    providers: providersFromEnv(process.env),
    fetch,
    rateLimiter,
    perAttemptMs: 12_000,
    budgetMs: 25_000,
    log: (entry) => console.info(JSON.stringify(entry)),
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
