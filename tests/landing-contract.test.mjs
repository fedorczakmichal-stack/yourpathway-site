import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("raw landing is English-first and client-facing", () => {
  assert.match(html, /<html lang="en" data-lang="en">/);
  assert.match(html, /Turn Goals Into Clear Next Steps/);
  assert.match(html, /progress you can see/);
  assert.doesNotMatch(html, /v75/);
  assert.doesNotMatch(html, /v81/);
  assert.doesNotMatch(html, /v82/);
  assert.match(html, /v83/);
});

test("English social metadata uses a cache-busted 1200x630 asset contract", async () => {
  assert.match(html, /og:locale" content="en_US"/);
  assert.match(html, /rel="canonical" href="https:\/\/yourpathway\.app\/"/);
  assert.match(html, /og:url" content="https:\/\/yourpathway\.app\/"/);
  assert.match(html, /og:image" content="[^"]+\/img\/og-v83-en\.jpg"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="630"/);
  assert.ok((await stat(new URL("../img/og-v83-en.jpg", import.meta.url))).size > 10_000);
});

test("survey and waitlist prepare user-controlled email drafts", () => {
  assert.match(html, /id="survey"[^>]+action="mailto:info@yourpathway\.app"/);
  assert.match(html, /id="waitlist-form"[^>]+action="mailto:info@yourpathway\.app"/);
  assert.match(html, /id="survey-mailto" href="mailto:info@yourpathway\.app"/);
  assert.match(html, /id="mail-waitlist" href="mailto:info@yourpathway\.app"/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
  assert.doesNotMatch(html, /FORM_ENDPOINT/);
  assert.doesNotMatch(html, /fetch\(FORM_ENDPOINT/);
  assert.match(html, /MAILTO_LIMIT=1800/);
  assert.match(html, /data-draft-mode/);
  assert.match(html, /enteredEmail/);
  assert.match(html, /testingAllowed/);
  assert.match(html, /window\.location\.href=link\.href/);
  assert.match(html, /Pathway v83 — survey answers/);
  assert.match(html, /Pathway v83 — full version signup/);
  assert.match(html, /if\(!surveyFallback\.open\)/);
  assert.doesNotMatch(html, /navigator\.clipboard\.writeText\(longText\)/);
  for (let index = 1; index <= 5; index += 1) {
    assert.match(html, new RegExp(`name="q${index}"[^>]+required`));
  }
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /only if you want a reply to your feedback/);
  assert.doesNotMatch(html, /Thank you—your response was sent/);
  assert.doesNotMatch(html, /You’re on the update list/);
  assert.doesNotMatch(html, /return \{firstSeen:/);
});

test("campaign labels are allowlisted and passed to app CTAs", () => {
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    assert.match(html, new RegExp(`"${key}"`));
  }
  assert.match(html, /url\.searchParams\.set\("landing_cta"/);
  assert.match(html, /data-app-cta="hero"/);
  assert.doesNotMatch(html, /searchParams\.set\([^\n]+email/i);
});

test("the app is served from this origin, so the landing can read its telemetry", async () => {
  // Do v82 apka stała na fedorczakmichal-stack.github.io, a landing na yourpathway.app.
  // Inny origin = inny localStorage, więc localUsageSummary() czytało PUSTY magazyn
  // i sekcja o użyciu w ankiecie nigdy nic nie niosła. Od v83 apka jest pod /app/.
  assert.doesNotMatch(html, /fedorczakmichal-stack\.github\.io/);
  assert.match(html, /data-app-cta="hero"[^>]+href="\/app\/"/);
  assert.match(html, /href="\/app\/phone\.html"/);
  assert.match(html, /TELEMETRY_KEY="pathway-telemetry-v1"/);

  const appHtml = await readFile(new URL("../app/index.html", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../app/manifest.webmanifest", import.meta.url), "utf8"));
  const worker = await readFile(new URL("../app/sw.js", import.meta.url), "utf8");

  assert.equal(manifest.id, "/app/");
  assert.equal(manifest.start_url, "./index.html?v=83");
  assert.equal(manifest.scope, "./");            // zakres /app/, nie koliduje z landingiem
  assert.match(worker, /const VERSION = "v83";/); // nowa nazwa cache'u kasuje poprzednią
  assert.match(appHtml, /v83-living-move-count/);
  // 21 MB dokumentu nie ma czego szukać w indeksie; landing zostaje indeksowalny
  assert.match(appHtml, /<meta name="robots" content="noindex,follow" \/>/);
  assert.ok((await stat(new URL("../app/index.html", import.meta.url))).size > 20_000_000);
});

test("fonts are self-hosted, so loading the page contacts no third-party CDN", async () => {
  // Regresja: przywrócenie <link> do Google Fonts wysyła IP każdego odwiedzającego
  // do strony trzeciej, zanim cokolwiek kliknie. Trzymamy fonty u siebie.
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\/(?!yourpathway\.app)[^"]*"[^>]*rel="stylesheet"/);

  const faces = [...html.matchAll(/src:url\((fonts\/[\w.-]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(faces.length >= 8, `oczekiwano >=8 @font-face, jest ${faces.length}`);
  for (const face of new Set(faces)) {
    assert.ok(
      (await stat(new URL(`../${face}`, import.meta.url))).size > 1_000,
      `brakuje pliku fontu: ${face}`,
    );
  }
  // latin-ext musi zostać — bez niego znikają polskie znaki diakrytyczne
  assert.ok(faces.some((f) => f.includes("latin-ext")));
});

test("ownership is stated in the licence, the markup and the footer", async () => {
  const licence = await readFile(new URL("../LICENSE", import.meta.url), "utf8");
  assert.match(licence, /Copyright \(c\) 2026 Michal Fedorczak\. All rights reserved\./);
  assert.match(licence, /SIL Open Font License/);
  assert.match(licence, /Open Database\s+Licence \(ODbL\)/);
  // Graf ulic pochodzi z OSM na ODbL (share-alike) — nie wolno go zastrzegać.
  assert.match(licence, /reservation does NOT extend to the street-graph data/);
  assert.match(html, /Copyright \(c\) 2026 Michal Fedorczak\. All rights reserved\./);
  assert.match(html, /© 2026 Michał Fedorczak/);
});

test("privacy and crawl support are present", async () => {
  const privacy = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.match(privacy, /User-controlled email delivery/);
  assert.doesNotMatch(privacy, /FormSubmit/i);
  assert.match(privacy, /may save it as a draft/);
  assert.match(privacy, /Pathway receives the message only after/);
  assert.match(privacy, /removeItem\("pathway-landing-attribution-v1"\)/);
  assert.doesNotMatch(privacy, /Clear this site's browser storage/);
  assert.match(privacy, /does not delete your Pathway goals or progress/);
  assert.match(privacy, /info@yourpathway\.app/);
  assert.match(robots, /Sitemap: https:\/\/yourpathway\.app\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/yourpathway\.app\/privacy\.html/);
  assert.match(sitemap, /<lastmod>2026-08-10<\/lastmod>/);
  // apka celowo poza sitemapą — jest na noindex
  assert.doesNotMatch(sitemap, /yourpathway\.app\/app\//);
});
