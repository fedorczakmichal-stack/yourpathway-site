# Pathway beta — konfiguracja kanałów

Stan zweryfikowany po migracji domeny: 2026-08-08. Ankieta v2 i transport hybrydowy: 2026-08-22.

## Aktualne adresy

- Landing: `https://yourpathway.app/`
- Ankieta (część A): `https://www.yourpathway.app/#ankieta`
- Ankieta część B (D7, tydzień później): `https://www.yourpathway.app/d7.html?rid=<rid>&a=<data części A>&lang=en|pl` — NIE linkowana publicznie, `noindex`, poza sitemapą; link wysyła właściciel mailem wyłącznie osobom z `x3_contact = yes`
- Odbiornik odpowiedzi (POST JSON): `https://pathway-feedback.netlify.app/api/feedback` (stała `FEEDBACK_ENDPOINT` — jedno miejsce w `index.html` i jedno w `d7.html`)
- Aplikacja: `https://yourpathway.app/app/` (od v83; `pathway-live` przekierowuje)
- Instagram: `https://www.instagram.com/pathway.day/`
- Facebook: `https://www.facebook.com/pathway.day`
- Główny kontakt i odbiorca wiadomości: `info@yourpathway.app`
- Wersja publicznego produktu komunikowana na stronie: `v87` (biogramy IG/FB wersji NIE podają — patrz niżej)

### Checklista podbicia wersji (zmieniać RAZEM, jednym commitem)

1. `index.html`: badge w hero („Free open beta · vNN"), podpis galerii („Current vNN beta screens"), stopka („beta vNN"), `og:image` + `twitter:image` → `img/og-vNN-en.jpg`, stała `SITE_VERSION="NN"` w skrypcie (z niej biorą się tematy e-maili fallbacku: „Pathway vNN — survey answers" / „— full version signup" / „— D7 answers" i pole `app_version` rekordu).
2. `img/`: skopiować `og-v(NN-1)-en.jpg` → `og-vNN-en.jpg` i `.svg` → `.svg` (obraz nie ma numeru wersji w treści; poprzednich plików NIE kasować — stare udostępnienia w social mediach nadal na nie wskazują).
3. `d7.html`: `SITE_VERSION` w skrypcie + numer w stopce (strona jest składana z tych samych fragmentów co landing).
4. `tests/landing-contract.test.mjs`: asercje wersji (landing, manifest `?v=NN`, `sw.js VERSION`, meta `pathway-build`).
5. `sitemap.xml`: `lastmod`.
6. Repo aplikacji: `index.html` (meta `pathway-build`), `public/sw.js` (VERSION), `public/manifest.webmanifest` (start_url `?v=NN`), `src/pwaPresentation.test.mjs`; świeży build wkleić do `app/`.
7. `npm test` musi przejść w całości PRZED pushem (asercje `app/` przechodzą dopiero po podmianie builda).

`yourpathway.app` jest główną domeną strony beta. Wcześniejszy adres GitHub Pages pozostaje technicznym adresem źródłowym i powinien przekierowywać do domeny głównej.

## Linki organiczne

Instagram — aktualny link w bio (pole linku jest edytowalne tylko w aplikacji mobilnej):

```text
https://yourpathway.app/?lang=en&utm_source=ig&utm_medium=social&utm_content=link_in_bio
```

Facebook Page — zweryfikowany link profilu:

```text
https://yourpathway.app/?utm_source=facebook&utm_medium=organic_social&utm_campaign=open_beta_us&utm_content=page_link
```

⚠ **W biogramach NIE MA numeru wersji — celowo.** Wcześniej stało tam „v80 browser beta",
przez co każde wydanie wymuszało ręczną poprawkę w dwóch serwisach (i bio zostawało w tyle,
bo pole linku na IG edytuje się tylko z telefonu). Numer wersji nic nie znaczy dla kogoś,
kto widzi produkt pierwszy raz. Wersja żyje na stronie i w `<meta pathway-build>` — tam wystarczy.

Instagram bio:

```text
Make progress you can see.
Each small next step grows your road—no streaks, no guilt.
Free browser beta—no account, no install ↓
```

Facebook bio:

```text
Pathway helps you keep moving on one meaningful goal. Each finished next step grows a road on a living map, so progress becomes something you can see. No streaks. No guilt. Free browser beta—no account or install.
```

Post/Reel/Story: zmieniaj wyłącznie `utm_source` i `utm_content`, np. `reel_visible_progress`, `reel_no_guilt`, `story_one_next_move`.

Landing przepuszcza tylko: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` oraz falę rekrutacji `src=w1|w2|w3` (first-touch). Dodaje do linku aplikacji `landing_cta=header|hero|survey|phone|final|footer`. Parametry są przechowywane lokalnie i trafiają do rekordu ankiety/zapisu dopiero po naciśnięciu „Send".

Linki rekrutacyjne per fala: `?src=w1&landing_cta=thread` (imienne wiadomości), `?src=w2&landing_cta=qr-print` / `…&landing_cta=post` (QR i polecenia), `?src=w3&landing_cta=post` + utm (publiczne posty).

## Ankieta v2 i zapisy — transport hybrydowy (v87, 2026-08-22)

Ankieta na landingu to **część A** badania (v2: bramka A0 + rozgałęzienie), `d7.html` to **część B** (D7). Oba formularze i zapisy na pełną wersję wysyłają rekord JSON metodą POST z tej samej strony na:

```text
https://pathway-feedback.netlify.app/api/feedback
```

Stała `FEEDBACK_ENDPOINT` stoi w **jednym** miejscu na początku skryptu w `index.html` (i analogicznie w `d7.html`). Test kontraktu pilnuje, że żaden `fetch` nie celuje gdzie indziej i że w skrypcie nie ma innego hosta.

Jak to działa od strony osoby wypełniającej:

1. Jeden przycisk główny „Send my answers" / „Wyślij odpowiedzi"; pod nim mały link „Copy my answers instead".
2. Walidacja lokalna (`reportValidity` + własny tekst błędu z `aria-invalid`/`aria-describedby` na fieldsetcie), potem POST (`Content-Type: application/json`, `credentials: omit`, limit 8 s przez `AbortController`).
3. Stany inline, bez modala: „Sending…" → przy 2xx z `{ok:true}`: „Received. Thank you. HH:MM · id …", formularz zablokowany, w `localStorage` zapis `pathway-survey-sent-v1` = `{rid, at, id}` (część B: `pathway-survey-b-sent-v1`).
4. Każda awaria (sieć, timeout, non-2xx, `{ok:false}`, blokada) odsłania **fallback**: pole z pełnym tekstem odpowiedzi, którego pierwsza linia to zapis maszynowy `#PW2A {...}` (`#PW2B` dla części B, `#PW2W` dla zapisów), przycisk „Copy answers" i link `mailto:info@yourpathway.app` z tematem „Pathway v87 — survey answers". Pełna treść wchodzi do `mailto:` tylko gdy mieści się w `MAILTO_LIMIT=1800`; inaczej szkic jest krótki i prosi o wklejenie skopiowanego tekstu. Status mówi wprost: „Could not reach the server — copy the answers below and send them yourself to info@yourpathway.app".

Co niesie rekord (nazwy pól wg codebooka z `survey-v2-spec`): `rid` (12 znaków `[a-z0-9]`, `pathway-rid-v1`), `form` A|B|W, `form_version`, `app_version`, `lang`, `transport` post|mailto|clipboard, blok rekrutacji `src_wave` (z `?src=w1|w2|w3`, first-touch w `pathway-src-v1`) / `src_cta` / `src_first_touch` / `src_utm`, kontekst z linku z apki `u_stage`/`u_mode` (oraz `u_d`/`u_m`/`u_route` **tylko przy zgodzie X1**), `reach_computed`/`reach_declared`/`reach_mismatch`, odpowiedzi `a1_…a18_` (pytania spoza gałęzi = `"n/d"`), zgody `x1_usage`/`x3_contact`/`x4_waitlist` i osobno `x2_email`. Blok `t_*` (telemetria per dzień) i `s_*` (stan własnej mapy: `pathProgress` = prawdziwa liczba kamieni, trasy z `pathOverrides[slot].templateId`, `segmentProgress` = realny częściowy postęp) wychodzi **wyłącznie** przy zaznaczonym X1/B7. Strona nigdy nie czyta tytułów celów, śladów ani imienia. ⚠ `move-completed` w telemetrii liczy SESJE, nie kamienie — nie wolno z niego wnioskować o kamieniach.

Pierwszeństwo kontekstu dla bramki A0: parametry URL z linku w apce (`stage`, `d`, `m`, `mode`, `r`, `v`) → `localStorage` tego originu → brak preselekcji. URL jest potrzebny, bo apka zainstalowana na ekranie głównym ma osobną przestrzeń danych.

Jak czytać odpowiedzi: backend (repo `pathway-feedback-endpoint`, jego README opisuje adres eksportu i format) trzyma rekordy w Netlify Blobs w koncie Pathway; `submitted_at` stempluje serwer. Odpowiedzi, które przyszły fallbackiem mailem, mają zapis maszynowy w pierwszej linii treści — da się go wkleić do tego samego arkusza.

Zapisy na pełną wersję (`#zapisy`, `form: "W"`): pola `email` i `future_beta_testing`, ten sam POST i ten sam fallback; checkbox zgody zostaje. Ankieta NIE dopisuje nikogo do listy — ma własne, osobne pole X4.

Część B (`d7.html`): czyta `?rid=`, `?a=` (data części A) i `?lang=`; bez `rid` w linku bierze rid użyty przy części A na tym urządzeniu; wstępnie zaznacza B1 z liczby dni aktywnych po dacie części A (gdy strona stoi na tym samym urządzeniu); zgoda na liczniki (B7) jest zbierana na nowo, nie dziedziczona.

Menu mobilne: poniżej 860 px nawigacja chowa się pod przycisk 44×44 (`aria-expanded`, `aria-controls`, Escape zamyka, fokus wraca na przycisk) i rozwija te same linki — w tym jedyny link „Survey".

## Aplikacja pod tym samym originem (v83, 2026-08-10)

Apka przeniosła się z `fedorczakmichal-stack.github.io/pathway-live/` pod **`https://yourpathway.app/app/`**.

Powód nie jest kosmetyczny. Landing czyta `localStorage["pathway-telemetry-v1"]`
w `localUsageSummary()`, a apka ten klucz zapisuje. Dopóki stały na różnych originach,
były to **dwa różne magazyny** — sekcja o użyciu w szkicu ankiety była zawsze pusta.
Od v83 to jeden origin i pomiar wreszcie działa.

Zrobione przy przenosinach:

- `manifest.webmanifest`: `id` → `/app/`, `start_url` → `./index.html?v=83`; `scope` został `./`,
  czyli zakres service workera to `/app/` i **nie koliduje** z landingiem (landing nie ma SW).
- `sw.js`: `VERSION` → `v83`, więc aktywacja kasuje cały poprzedni cache.
- Apka dostała `<meta name="robots" content="noindex,follow">` — 21 MB dokumentu nie ma
  czego szukać w indeksie. Z tego samego powodu `/app/` **celowo nie jest w `sitemap.xml`**.
- `pathway-live` zostaje jako przekierowanie; nie kasować, bo adres krąży w starych linkach.

⚠ Repo strony rośnie teraz o ~21 MB na każde wydanie apki. Po kilkudziesięciu wydaniach
historia gita zbliży się do miękkiego limitu 1 GB. Przy okazji większego porządku warto
spłaszczyć historię (`--orphan`) albo trzymać apkę na osobnej gałęzi.

## Fonty i własność (v83, 2026-08-10)

Fonty **Instrument Sans** i **Newsreader** są hostowane lokalnie w `fonts/` (8 plików woff2,
łącznie ok. 384 KB, subsety `latin` + `latin-ext`). Strona nie odwołuje się już do
`fonts.googleapis.com` ani `fonts.gstatic.com`, więc wczytanie landinga nie ujawnia IP
odwiedzającego żadnej stronie trzeciej. Licencje OFL 1.1 leżą w `fonts/OFL-*.txt`.

- `latin-ext` jest **wymagany** — bez niego znikają polskie znaki (ą ć ę ł ń ś ź ż).
- Oba kroje to fonty zmienne: jeden plik obsługuje cały zakres wag, dlatego
  `font-weight` w `@font-face` jest podany zakresem (`400 700`, `400 600`).

Własność opisuje `LICENSE` (ten sam plik w trzech repo: strony, aplikacji i `pathway-live`).
Jest proprietary/all rights reserved, ale **nie zastrzega danych ulic** — graf pochodzi
z OpenStreetMap i jako baza pochodna podlega ODbL (share-alike). Zastrzeżony jest kod,
grafika, teksty i nazwa; rysowane mapy to Produced Work wg art. 4.5 ODbL i zostają nasze.

Nota copyright występuje w trzech miejscach: komentarz HTML po `<!doctype html>`
(również w źródle apki, żeby przetrwał kolejny build), widoczna linia w stopce oraz `LICENSE`.

## Audyt przedpremierowy 2026-08-11 — co zmieniono

- **QR na landingu koduje teraz `https://www.yourpathway.app/app/phone.html`** (wcześniej stary
  github.io/pathway-live → 3 skoki przez stub). Stub `pathway-live` ZOSTAJE — stare wydruki QR
  i linki w obiegu nadal przez niego trafiają do apki.
- **Ankieta**: adres `info@yourpathway.app` jest widoczny w bloku ankiety; przy długich
  odpowiedziach (tryb „copy”) submit sam kopiuje odpowiedzi do schowka (Promise; odmowa →
  ręczny fallback z adresem); pod statusem pojawia się na żywo nota o trybie kopiuj-wklej;
  skopiowany tekst zawiera pierwszą linię „Do:/To: info@yourpathway.app”. Źródło i podsumowanie
  użycia w mailu są sformatowane czytelnie (bez surowego JSON-a — krótszy mailto).
- **Canonical/OG/robots/sitemap wskazują `https://www.yourpathway.app/…`** (domena główna to www;
  apex tylko przekierowuje — meta na apex dokładały skok dla crawlerów).
- **Licencja jako strona**: stopka linkuje `license.html` (plik `LICENSE` bez rozszerzenia Pages
  serwuje jako octet-stream = wymuszone pobieranie). Plik `LICENSE` zostaje w repo.
- **404.html** — markowa strona błędu z powrotem na landing i do apki.
- **privacy.html**: jawnie mówi, że apka i strona dzielą jeden magazyn przeglądarki
  (wyczyszczenie danych witryny kasuje TAKŻE cele w apce); pełna lista kluczy localStorage
  (`pathway-landing-lang`, `utm_term`); doprecyzowane „nothing leaves your device on its own”.
- **A11y**: safe-area globalnie (landscape z notchem), `color-scheme:light`, dwujęzyczne
  `alt`/`aria-label` przełączane z językiem (domyślnie EN), większe cele dotykowe EN|PL,
  suwak dzień/noc pauzuje poza viewportem, focus na przycisku „kopiuj”.
- **phone.html** (w repo apki, kopiowane do `/app/`): podpis po angielsku (był jedyny polski
  string w EN-only produkcie).

## Zasady

- Reklamy pozostają wyłączone do czasu działającego pomiaru activation/D7.
- Ankieta nie zapisuje automatycznie emaila na waitlistę.
- Nie wysyłamy tekstu celu ani identyfikatora osoby w UTM/analityce.
- Zatwierdzone tagi `v1-approved` i `v2-approved` pozostają nietknięte.
- Wdrożenie klientocentryczne: commit `1d64122`, tag `v3-client-facing`.
- Testy kontraktu strony (`npm test`) pilnują regresji: brak zewnętrznego CDN-u fontów,
  brak linków do `github.io`, obecność noty copyright, spójność wersji v87, jeden endpoint
  POST i brak `action="mailto:"`, rozgałęzienie ankiety v2, `d7.html` na `noindex`, prawdziwy opis
  transportu w `privacy.html`, menu mobilne.

## Zabezpieczenia procesu GitHub Pages

- Przed zmianą domeny zawsze odczytać stan Pages i certyfikatu. Nigdy nie usuwać i nie dodawać ponownie `CNAME` tylko dlatego, że certyfikat oczekuje — taki cykl anuluje i uruchamia provisioning od początku.
- `.nojekyll` pozostaje celowo, aby statyczna strona omijała Jekylla. Nie jest i nie może być traktowany jako naprawa certyfikatu TLS.
- Lokalny `main` synchronizować wyłącznie przez `git fetch` i czysty fast-forward. Bez resetu, rebase’u i force-push.
- `main` jest chroniony: publikacje przechodzą przez pull request, wymagają liniowej historii i nie pozwalają na force-push ani usunięcie gałęzi.
- Gdy certyfikat ma stan inny niż `approved`, nie uruchamiać zbędnych buildów i nie zmieniać DNS. Po 24 godzinach eskalować do GitHub Support z `/pages`, `/pages/health`, DNS, TLS i CT zamiast kolejnego resetu.
