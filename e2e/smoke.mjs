// Route smoke test against a running server: `npm run build && npm start`, then `npm run smoke`.
// Set BASE_URL to test another host, e.g. a Vercel preview.
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const DEMO_DRAFT =
  "hey guys — pushing launch to friday, few things to fix before we go live. the checkout bug is still not fixed and QA needs 2 more days. release notes are with Priya, ping her if anything changes.";

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function get(path) {
  const response = await fetch(BASE + path, { redirect: "manual" });
  return { status: response.status, text: await response.text(), headers: response.headers };
}

function internalLinks(html) {
  return [...html.matchAll(/href="(\/[^"#]*)(?:#[^"]*)?"/g)]
    .map((m) => m[1] || "/")
    .filter((href) => !href.startsWith("/_next/") && !href.startsWith("//"));
}

const home = await get("/");
check("GET / returns 200", home.status === 200, `got ${home.status}`);
check("home has the page title", home.text.includes("One draft."));
check("home renders the studio", home.text.includes('id="studio"'));

const methodology = await get("/methodology");
check("GET /methodology returns 200 on direct load", methodology.status === 200, `got ${methodology.status}`);
check("methodology documents Fact Guard", methodology.text.includes('id="fact-guard"'));

const missing = await get("/this-route-does-not-exist");
check("unknown route returns 404", missing.status === 404, `got ${missing.status}`);
check("404 page links home", missing.text.includes("doesn&#x27;t exist") && missing.text.includes('href="/"'));

const api = await get("/api/transform");
check("GET /api/transform returns 405", api.status === 405, `got ${api.status}`);
check("405 body is JSON with an error code", api.text.includes('"METHOD_NOT_ALLOWED"'));
check("security headers are set", api.headers.get("x-content-type-options") === "nosniff");

const links = new Set([...internalLinks(home.text), ...internalLinks(methodology.text), ...internalLinks(missing.text)]);
for (const href of links) {
  const { status } = await get(href);
  check(`link ${href} resolves`, status === 200, `got ${status}`);
}

const post = (body) =>
  fetch(`${BASE}/api/transform`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const demo = await post({ original_text: DEMO_DRAFT, persona: "c_level" });
const demoBody = await demo.json();
check("POST with the built-in example returns 200", demo.status === 200, `got ${demo.status}`);
check("response carries all ten metrics", Object.keys(demoBody.result?.metrics ?? {}).length === 10);
console.log(`      mode: ${demoBody.meta?.mode}, provider: ${demoBody.meta?.provider}`);

const bad = await post({ original_text: "hello", persona: "pirate" });
check("unsupported persona returns 400", bad.status === 400, `got ${bad.status}`);

const tooLong = await post({ original_text: "a".repeat(4001), persona: "c_level" });
check("oversized draft returns 413", tooLong.status === 413, `got ${tooLong.status}`);

if (demoBody.meta?.mode === "demo") {
  const own = await post({ original_text: "my own draft about the quarterly plan", persona: "gen_z" });
  const ownBody = await own.json();
  check("demo mode refuses non-example drafts", ownBody.error?.code === "LIVE_AI_NOT_CONFIGURED", ownBody.error?.code);
}

console.log(failures === 0 ? "\nAll smoke checks passed." : `\n${failures} smoke check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
