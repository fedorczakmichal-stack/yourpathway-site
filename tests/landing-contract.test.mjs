import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const d7 = await readFile(new URL("../d7.html", import.meta.url), "utf8");
const inlineScript = (page) => page.match(/<script>\n([\s\S]*?)<\/script>\n<\/body>/)[1];

test("raw landing is English-first and client-facing", () => {
  assert.match(html, /<html lang="en" data-lang="en">/);
  assert.match(html, /Turn Goals Into Clear Next Steps/);
  assert.match(html, /progress you can see/);
  assert.doesNotMatch(html, /v75/);
  assert.doesNotMatch(html, /v81/);
  assert.doesNotMatch(html, /v82/);
  // v83 może zostać tylko w nazwach starych plików OG (nie kasujemy ich)
  assert.doesNotMatch(html.replace(/og-v83/g, ""), /v83/);
  assert.match(html, /Free open beta · v84/);
  assert.match(html, /Current v84 beta screens/);
  assert.match(html, /A living map for real life · beta v84/);
  assert.match(html, /var SITE_VERSION="84";/);
});

test("English social metadata uses a cache-busted 1200x630 asset contract", async () => {
  assert.match(html, /og:locale" content="en_US"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.yourpathway\.app\/"/);
  assert.match(html, /og:url" content="https:\/\/www\.yourpathway\.app\/"/);
  assert.match(html, /og:image" content="[^"]+\/img\/og-v84-en\.jpg"/);
  assert.match(html, /twitter:image" content="[^"]+\/img\/og-v84-en\.jpg"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="630"/);
  assert.ok((await stat(new URL("../img/og-v84-en.jpg", import.meta.url))).size > 10_000);
  assert.ok((await stat(new URL("../img/og-v84-en.svg", import.meta.url))).size > 1_000);
  // poprzednie pliki OG zostają — stare udostępnienia nadal na nie wskazują
  assert.ok((await stat(new URL("../img/og-v83-en.jpg", import.meta.url))).size > 10_000);
});

test("survey v2: hybrid transport — one endpoint, POST from the page, calm fallback", () => {
  const js = inlineScript(html);
  // adres serwera stoi w DOKŁADNIE jednym miejscu (orkiestrator może podmienić host)
  assert.equal(html.match(/FEEDBACK_ENDPOINT="/g).length, 1);
  assert.match(js, /var FEEDBACK_ENDPOINT="https:\/\/pathway-feedback\.netlify\.app\/api\/feedback";/);
  // żaden fetch poza endpointem
  const fetches = [...js.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1].trim());
  assert.ok(fetches.length >= 1);
  assert.ok(fetches.every((target) => target === "FEEDBACK_ENDPOINT"), `fetch do innego celu: ${fetches.join(", ")}`);
  const hosts = new Set([...js.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  assert.deepEqual([...hosts], ["pathway-feedback.netlify.app"]);
  assert.match(js, /method:"POST"/);
  assert.match(js, /credentials:"omit"/);
  assert.match(js, /"Content-Type":"application\/json"/);
  assert.match(js, /var POST_TIMEOUT_MS=8000;/);
  assert.match(js, /new AbortController\(\)/);
  assert.match(js, /json\.ok!==true/);
  // formularze bez action="mailto:" (ostrzeżenie mixed-content + interstitial Chrome)
  assert.doesNotMatch(html, /action="mailto:/);
  assert.doesNotMatch(html, /enctype="text\/plain"/);
  assert.match(html, /<form id="survey" class="survey reveal" action="#ankieta" method="post" autocomplete="off" novalidate data-form="A">/);
  assert.match(html, /<form id="waitlist-form" class="signup-form" action="#zapisy" method="post" novalidate data-form="W">/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
  assert.doesNotMatch(html, /FORM_ENDPOINT/);
  // jeden przycisk główny + mały link „skopiuj zamiast”; stare trzy przyciski znikły
  assert.match(html, /id="survey-submit"[^>]*>\s*<span class="pl">Wyślij odpowiedzi<\/span><span class="en">Send my answers<\/span>/);
  assert.match(html, /id="survey-copy"[^>]*>\s*<span class="pl">Albo skopiuj moje odpowiedzi<\/span><span class="en">Copy my answers instead<\/span>/);
  assert.doesNotMatch(html, /Open the same draft/);
  assert.doesNotMatch(html, /Open email draft/);
  assert.doesNotMatch(html, /Copy instead of sending/);
  // fallback: tekst z linią maszynową, kopiowanie, mailto w budżecie 1800
  assert.match(html, /id="survey-fallback" hidden/);
  assert.match(html, /id="survey-plain"/);
  assert.match(html, /id="survey-copy-btn"/);
  assert.match(html, /id="survey-mailto" href="mailto:info@yourpathway\.app"/);
  assert.match(js, /MAILTO_LIMIT=1800/);
  assert.match(js, /"#PW2A "\+JSON\.stringify\(rec\)/);
  assert.match(js, /data-draft-mode/);
  assert.match(js, /Could not reach the server — copy the answers below and send them yourself to info@yourpathway\.app/);
  assert.match(js, /"Received\. Thank you\. "\+localTime\(\)/);
  assert.match(js, /SENT_KEY="pathway-survey-sent-v1"/);
  assert.match(js, /Pathway v"\+SITE_VERSION\+" — survey answers/);
  assert.match(js, /Pathway v"\+SITE_VERSION\+" — full version signup/);
  assert.match(js, /"#PW2W "\+JSON\.stringify\(rec\)/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /Thank you—your response was sent/);
});

test("survey v2: A0 gate, branching markers, consent tail and device reading", () => {
  const js = inlineScript(html);
  // kotwica i id formularza — apka linkuje do #ankieta
  assert.match(html, /<section id="ankieta"/);
  assert.match(html, /<form id="survey"/);
  // A0 zawsze widoczne, wymagane, z podpowiedzią o wstępnym wypełnieniu
  assert.match(html, /data-q="A0_GATE" data-show="always" data-required/);
  assert.match(html, /name="reach_declared" value="page_only" required/);
  for (const value of ["looked", "own_map", "first_move", "returner"]) assert.match(html, new RegExp(`name="reach_declared" value="${value}"`));
  assert.match(html, /data-prefill-hint hidden>We filled this in from this device/);
  // rozgałęzienie: każde pytanie z etykietą widoczności; ukryte = hidden + disabled
  const branches = {
    A1_BOUNCE: "page_only", A2_MAYAGAP: "looked", A3_STALLED: "own_map", A4_OFFLINE: "own_map",
    A5_REALACTION: "first_move returner", A6_NEXTMOVE: "first_move returner", A7_ANCHOR: "own_map first_move returner",
    A8_SECOND_RETURN: "returner", A9_PARTIAL: "first_move returner", A10_PATHPICK: "own_map first_move returner",
    A11_PATHFIT: "own_map first_move returner", A12_MAPROLE: "first_move returner",
    A13_MANHATTAN: "looked own_map first_move returner", A14_PRIOR: "own_map first_move returner",
    A15_FALLBACK: "own_map first_move returner", A16_OPEN_MOMENT: "page_only looked",
    A17_OPEN_RETURN: "own_map first_move returner", A18_HOWFOUND: "always",
  };
  for (const [id, show] of Object.entries(branches)) {
    const re = new RegExp(`data-q="${id}" data-show="${show}"[^>]*${show === "always" ? "" : "hidden disabled"}`);
    assert.match(html, re, `brak rozgałęzienia ${id}`);
  }
  assert.match(html, /data-q="A9_PARTIAL"[^>]*data-needs="partial"/);
  assert.match(html, /data-q="A10_PATHPICK"[^>]*data-needs="noroute"/);
  assert.match(html, /data-q="A13_MANHATTAN"[^>]*data-needs="maprole"/);
  // dokładnie jedno pole otwarte na gałąź, limit 400 znaków, ostrzeżenie o treści celu
  assert.equal(html.match(/<textarea name="a1[67]_open_[a-z]+" rows="3" maxlength="400"/g).length, 2);
  assert.match(html, /Please do not paste the text of your goal here/);
  for (const name of ["a1_bounce", "a2_mayagap", "a3_stalled", "a5_realaction", "a6_nextmove", "a7_anchor"]) {
    assert.match(html, new RegExp(`name="${name}" value="[a-z_]+" required`), `${name} powinno być wymagane`);
  }
  assert.match(js, /rec\[name\]=fs\.hidden\?"n\/d":answer\(fs\)/);
  assert.match(js, /fs\.hidden=!on; fs\.disabled=!on;/);
  // ogon: X1 tuż nad przyciskiem (po A18 i po kontakcie), e-mail osobno, X3/X4 bramkowane adresem
  const posA18 = html.indexOf('data-q="A18_HOWFOUND"');
  const posX1 = html.indexOf('id="usage-box"');
  const posSend = html.indexOf('id="survey-submit"');
  const posA0 = html.indexOf('data-q="A0_GATE"');
  assert.ok(posA0 < posA18 && posA18 < posX1 && posX1 < posSend, "X1 musi stać po A18 i bezpośrednio nad przyciskiem");
  assert.match(html, /id="x1-usage" name="x1_usage" type="checkbox" value="yes">/);
  assert.doesNotMatch(html, /id="x1-usage"[^>]*checked/);
  assert.match(html, /id="usage-toggle" aria-expanded="false" aria-controls="usage-preview"/);
  assert.match(html, /Show exactly what will be sent/);
  assert.match(html, /id="x2-email" name="x2_email" type="email"/);
  assert.match(html, /id="x3-contact" name="x3_contact" type="checkbox" value="yes" disabled data-needs-email/);
  assert.match(html, /id="x4-waitlist" name="x4_waitlist" type="checkbox" value="yes" disabled data-needs-email/);
  assert.match(html, /leaving an email is not consent by itself/);
  // liczniki i trasy wychodzą tylko przy zgodzie; rid i fala rekrutacji
  assert.match(js, /if\(usage\)\{ var u=usagePayload\(ctx\);/);
  assert.match(js, /RID_KEY="pathway-rid-v1"/);
  assert.match(js, /SRC_KEY="pathway-src-v1"/);
  assert.match(js, /\/\^w\[123\]\$\//);
  assert.match(js, /TELEMETRY_KEY="pathway-telemetry-v1"/);
  assert.match(js, /OWN_MAP_KEY="pathway-own-map-v2:manhattan"/);
  assert.match(js, /DEMO_KEY="pathway-maya-demo-v1"/);
  assert.match(js, /minutesCompleted/);
  // ⚠ move-completed liczy SESJE — nigdy nie może rozstrzygać o kamieniach
  assert.doesNotMatch(js, /move-completed[^\n]*(milestone|reach|computed)/);
  assert.match(js, /var ms=s\?s\.milestones:0/);
  // nic z tych pól nie wolno czytać: tytuły, ślady, imię
  for (const forbidden of ["profileName", "activityLog", "goalDraft", "(?<!document)\\.title\\b", "pathHistory", "restoredDefinition", "personalTrace"]) {
    assert.doesNotMatch(js, new RegExp(forbidden), `skrypt czyta ${forbidden}`);
  }
});

test("campaign labels are allowlisted and passed to app CTAs", () => {
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    assert.match(html, new RegExp(`"${key}"`));
  }
  assert.match(html, /url\.searchParams\.set\("landing_cta"/);
  assert.match(html, /data-app-cta="hero"/);
  assert.match(html, /data-app-cta="survey"/);
  assert.doesNotMatch(html, /searchParams\.set\([^\n]+email/i);
});

test("mobile navigation keeps the survey reachable below 860px", () => {
  assert.match(html, /<button type="button" class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="site-menu" aria-label="Menu"/);
  assert.match(html, /<nav class="menu" id="site-menu" aria-label="Menu">/);
  assert.match(html, /<a href="#ankieta"><span class="pl">Ankieta<\/span><span class="en">Survey<\/span><\/a>/);
  assert.match(html, /\.menu-btn\{display:none;flex:none;[^}]*width:44px;height:44px;/);
  assert.match(html, /@media \(max-width:860px\)\{\n  \.bar\{position:relative\}\n  \.menu-btn\{display:inline-flex\}/);
  assert.match(html, /header\.menu-open nav\.menu\{display:flex\}/);
  assert.doesNotMatch(html, /@media \(max-width:860px\)\{nav\.menu\{display:none\}\}/);
  assert.match(html, /e\.key==="Escape"&&menuOpen/);
});

test("a11y: fieldset/legend per question, non-:has pill fallback, dark focus ring on light sections", () => {
  const questions = html.match(/<fieldset class="q[^"]*" data-q="/g).length;
  assert.equal(questions, 19);
  assert.equal(html.match(/<fieldset class="q[^"]*" data-q="[^"]+"[^>]*>\n\s*<legend>/g).length, 19);
  assert.match(html, /\.survey \.opts label:has\(input:checked\),\.survey \.opts label\.is-on\{/);
  assert.match(html, /\.survey \.opts label:has\(input:focus-visible\),\.survey \.opts label\.has-focus\{outline:3px solid var\(--tile\)/);
  assert.match(html, /label\.classList\.toggle\("is-on"/);
  assert.match(html, /a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible\{outline:3px solid var\(--tile\);/);
  assert.match(html, /\.dark :focus-visible,header :focus-visible,footer :focus-visible,\.dark-panel :focus-visible,\.bigcard:not\(\.paper-card\) :focus-visible\{outline-color:var\(--gold\)\}/);
  assert.match(html, /\.survey \.opts label\{[^}]*min-height:44px/);
  assert.match(html, /\.consent-line\{[^}]*min-height:44px/);
  assert.match(html, /class="q-error" id="err-a1_bounce" hidden/);
  assert.match(html, /fs\.setAttribute\("aria-invalid","true"\)/);
  assert.match(html, /fs\.setAttribute\("aria-describedby",err\.id\)/);
  assert.match(html, /\.wrap\{[^}]*padding-left:max\(22px,env\(safe-area-inset-left\)\)/);
  assert.match(html, /<meta name="color-scheme" content="light">/);
  assert.match(html, /alt="Start screen: choosing between Maya's example and your own map" data-alt-pl=/);
  assert.match(html, /data-label-pl="Twoja odpowiedź" data-label-en="Your answer"/);
});

test("d7.html (Part B) exists, is noindex, shares the transport and stays out of the sitemap", async () => {
  const js = inlineScript(d7);
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.match(d7, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(d7, /<form id="survey-b" class="survey" action="#" method="post" autocomplete="off" novalidate data-form="B">/);
  for (const id of ["B1_RETURNED", "B2_WHATFOR", "B3_REALMOVE", "B4_RECALL", "B5_STATUS", "B6_OPEN_MISSED"]) assert.match(d7, new RegExp(`data-q="${id}"`));
  assert.match(d7, /data-q="B2_WHATFOR" data-show="returned" hidden disabled/);
  assert.match(d7, /id="b7-usage" name="b7_usage" type="checkbox" value="yes">/);
  assert.match(d7, /id="b8-call" name="b8_call" type="checkbox" value="yes">/);
  assert.match(d7, /data-a-date="en">the first survey</);
  assert.equal(d7.match(/FEEDBACK_ENDPOINT="/g).length, 1);
  assert.match(js, /var FEEDBACK_ENDPOINT="https:\/\/pathway-feedback\.netlify\.app\/api\/feedback";/);
  const hosts = new Set([...js.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  assert.deepEqual([...hosts], ["pathway-feedback.netlify.app"]);
  assert.match(js, /p\.get\("rid"\)/);
  assert.match(js, /p\.get\("a"\)/);
  assert.match(js, /"#PW2B "\+JSON\.stringify\(rec\)/);
  assert.match(js, /SENT_B_KEY="pathway-survey-b-sent-v1"/);
  assert.match(js, /Pathway v"\+SITE_VERSION\+" — D7 answers/);
  assert.doesNotMatch(d7, /action="mailto:/);
  assert.doesNotMatch(d7, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(html, /href="d7\.html"/); // nigdzie nie linkowane publicznie
  assert.doesNotMatch(sitemap, /d7\.html/);
});

test("the app is served from this origin, so the landing can read its telemetry", async () => {
  // Do v82 apka stała na fedorczakmichal-stack.github.io, a landing na yourpathway.app.
  // Inny origin = inny localStorage, więc landing czytał PUSTY magazyn. Od v83 apka jest pod /app/.
  assert.doesNotMatch(html, /fedorczakmichal-stack\.github\.io/);
  assert.match(html, /data-app-cta="hero"[^>]+href="\/app\/"/);
  assert.match(html, /href="\/app\/phone\.html"/);
  assert.match(html, /TELEMETRY_KEY="pathway-telemetry-v1"/);

  const appHtml = await readFile(new URL("../app/index.html", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../app/manifest.webmanifest", import.meta.url), "utf8"));
  const worker = await readFile(new URL("../app/sw.js", import.meta.url), "utf8");

  assert.equal(manifest.id, "/app/");
  assert.equal(manifest.start_url, "./index.html?v=84");
  assert.equal(manifest.scope, "./");            // zakres /app/, nie koliduje z landingiem
  assert.match(worker, /const VERSION = "v84";/); // nowa nazwa cache'u kasuje poprzednią
  assert.match(appHtml, /<meta name="pathway-build" content="v84/);
  // 21 MB dokumentu nie ma czego szukać w indeksie; landing zostaje indeksowalny
  assert.match(appHtml, /<meta name="robots" content="noindex,follow" \/>/);
  assert.ok((await stat(new URL("../app/index.html", import.meta.url))).size > 20_000_000);
});

test("fonts are self-hosted, so loading the page contacts no third-party CDN", async () => {
  // Regresja: przywrócenie <link> do Google Fonts wysyła IP każdego odwiedzającego
  // do strony trzeciej, zanim cokolwiek kliknie. Trzymamy fonty u siebie.
  for (const page of [html, d7]) {
    assert.doesNotMatch(page, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
    assert.doesNotMatch(page, /<link[^>]+href="https?:\/\/(?!yourpathway\.app)[^"]*"[^>]*rel="stylesheet"/);
    assert.doesNotMatch(page, /<script[^>]+src="https?:/);
  }
  const faces = [...html.matchAll(/src:url\((fonts\/[\w.-]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(faces.length >= 8, `oczekiwano >=8 @font-face, jest ${faces.length}`);
  for (const face of new Set([...faces, ...[...d7.matchAll(/src:url\((fonts\/[\w.-]+\.woff2)\)/g)].map((m) => m[1])])) {
    assert.ok(
      (await stat(new URL(`../${face}`, import.meta.url))).size > 1_000,
      `brakuje pliku fontu: ${face}`,
    );
  }
  // latin-ext musi zostać — bez niego znikają polskie znaki diakrytyczne
  assert.ok(faces.some((f) => f.includes("latin-ext")));
});

test("licence renders as a page and a branded 404 exists", async () => {
  assert.match(html, /<a href="license\.html">/);
  const licPage = await readFile(new URL("../license.html", import.meta.url), "utf8");
  assert.match(licPage, /Copyright \(c\) 2026 Michal Fedorczak/);
  const nf = await readFile(new URL("../404.html", import.meta.url), "utf8");
  assert.match(nf, /This street does not exist/);
  assert.match(nf, /href="\/app\/"/);
});

test("ownership is stated in the licence, the markup and the footer", async () => {
  const licence = await readFile(new URL("../LICENSE", import.meta.url), "utf8");
  assert.match(licence, /Copyright \(c\) 2026 Michal Fedorczak\. All rights reserved\./);
  assert.match(licence, /SIL Open Font License/);
  assert.match(licence, /Open Database\s+Licence \(ODbL\)/);
  // Graf ulic pochodzi z OSM na ODbL (share-alike) — nie wolno go zastrzegać.
  assert.match(licence, /reservation does NOT extend to the street-graph data/);
  assert.match(html, /Copyright \(c\) 2026 Michal Fedorczak\. All rights reserved\./);
  assert.match(d7, /Copyright \(c\) 2026 Michal Fedorczak\. All rights reserved\./);
  // W stopce stoi marka, bo "Pathway" nie jest osobą i nie może być podmiotem praw;
  // właściciela nazywa LICENSE, do którego stopka linkuje.
  assert.match(html, /© 2026 Pathway/);
  assert.match(html, /<a href="license\.html">/);
  assert.doesNotMatch(html, /© 2026 Michał Fedorczak/);
});

test("privacy tells the truth about the new transport; crawl support is present", async () => {
  const privacy = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.match(privacy, /Last updated: August 22, 2026/);
  assert.match(privacy, /hosted on Netlify \(Netlify, Inc\., acting as our hosting provider and processor\)/);
  assert.match(privacy, /Netlify Blobs inside Pathway’s own account/);
  assert.match(privacy, /only if you tick “Include an anonymous usage summary”/);
  assert.match(privacy, /never the text of a goal/);
  assert.match(privacy, /deleted at the latest 12 months after the beta ends/);
  assert.match(privacy, /If the server cannot be reached/);
  assert.match(privacy, /<code>mailto:<\/code> link/);
  assert.match(privacy, /<code>d7\.html<\/code>/);
  assert.match(privacy, /do not send that email to anyone who did not tick the box/);
  assert.match(privacy, /leave your device only when you tick the box and press “Send”/);
  assert.match(privacy, /pathway-rid-v1/);
  assert.match(privacy, /pathway-src-v1/);
  assert.match(privacy, /pathway-landing-lang/);
  assert.match(privacy, /utm_term/);
  assert.match(privacy, /removeItem\(key\)/);
  assert.match(privacy, /does not delete your Pathway goals or progress/);
  assert.match(privacy, /deletes your Pathway goals and progress too/);
  assert.doesNotMatch(privacy, /FormSubmit/i);
  assert.doesNotMatch(privacy, /User-controlled email delivery/);
  assert.doesNotMatch(privacy, /does not post survey or signup data/);
  assert.match(privacy, /info@yourpathway\.app/);
  assert.match(robots, /Sitemap: https:\/\/www\.yourpathway\.app\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/www\.yourpathway\.app\/privacy\.html/);
  assert.match(sitemap, /<lastmod>2026-08-22<\/lastmod>/);
  // apka celowo poza sitemapą — jest na noindex
  assert.doesNotMatch(sitemap, /yourpathway\.app\/app\//);
});
