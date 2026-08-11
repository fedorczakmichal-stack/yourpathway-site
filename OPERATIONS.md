# Pathway beta — konfiguracja kanałów

Stan zweryfikowany po migracji domeny: 2026-08-08.

## Aktualne adresy

- Landing: `https://yourpathway.app/`
- Ankieta: `https://yourpathway.app/#ankieta`
- Aplikacja: `https://yourpathway.app/app/` (od v83; `pathway-live` przekierowuje)
- Instagram: `https://www.instagram.com/pathway.day/`
- Facebook: `https://www.facebook.com/pathway.day`
- Główny kontakt i odbiorca wiadomości: `info@yourpathway.app`
- Wersja publicznego produktu komunikowana na stronie: `v83` (biogramy IG/FB wersji NIE podają — patrz niżej; przy podbiciu wersji zmienić RAZEM: badge, podpis galerii, stopkę, temat i treść szkiców e-mail, plik OG, `tests/landing-contract.test.mjs`, a w repo aplikacji `index.html` (meta `pathway-build`), `public/sw.js` (VERSION), `public/manifest.webmanifest` (start_url) oraz `src/pwaPresentation.test.mjs`)

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

Landing przepuszcza tylko: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Dodaje do linku aplikacji `landing_cta=header|hero|survey|phone|final|footer`. Parametry są przechowywane lokalnie i pojawiają się tylko w szkicu wiadomości z ankiety, którą użytkownik sam może wysłać.

## Ankieta i zapisy — bez pośrednika formularzowego

Strona nie korzysta z FormSubmit ani innego endpointu. Oba formularze walidują pola lokalnie i przygotowują szkic skierowany do:

```text
info@yourpathway.app
```

Użytkownik musi sam kliknąć „Wyślij” w swoim kliencie poczty. Strona nie pokazuje potwierdzenia dostarczenia i nie resetuje odpowiedzi po otwarciu szkicu. Ankieta ma jawny fallback kopiowania pełnych odpowiedzi. Jeśli treść przekracza bezpieczny limit adresu `mailto:`, strona przygotowuje krótki szkic i pokazuje pełne odpowiedzi do wklejenia. Szkic zapisu zawiera wpisany adres e-mail oraz stan zgody na przyszłe testy.

Ograniczenia tego rozwiązania:

1. Wymaga skonfigurowanej obsługi linków e-mail na urządzeniu użytkownika.
2. Nie daje panelu statystyk, automatycznej deduplikacji ani potwierdzenia doręczenia.
3. Wyniki są obsługiwane bezpośrednio w skrzynce Google Workspace.
4. Automatyczna wysyłka jednym kliknięciem wymagałaby własnego backendu i dostawcy poczty; nie należy jej dodawać bez osobnej decyzji o retencji, ochronie antyspamowej i kosztach.

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
  brak linków do `github.io`, obecność noty copyright i spójność wersji v83.

## Zabezpieczenia procesu GitHub Pages

- Przed zmianą domeny zawsze odczytać stan Pages i certyfikatu. Nigdy nie usuwać i nie dodawać ponownie `CNAME` tylko dlatego, że certyfikat oczekuje — taki cykl anuluje i uruchamia provisioning od początku.
- `.nojekyll` pozostaje celowo, aby statyczna strona omijała Jekylla. Nie jest i nie może być traktowany jako naprawa certyfikatu TLS.
- Lokalny `main` synchronizować wyłącznie przez `git fetch` i czysty fast-forward. Bez resetu, rebase’u i force-push.
- `main` jest chroniony: publikacje przechodzą przez pull request, wymagają liniowej historii i nie pozwalają na force-push ani usunięcie gałęzi.
- Gdy certyfikat ma stan inny niż `approved`, nie uruchamiać zbędnych buildów i nie zmieniać DNS. Po 24 godzinach eskalować do GitHub Support z `/pages`, `/pages/health`, DNS, TLS i CT zamiast kolejnego resetu.
