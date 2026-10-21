# Architektura

Ten dokument opisuje, jak zbudowany jest Garnuszek i dlaczego podjęliśmy takie, a nie inne decyzje.
Aktualizujemy go razem z kodem.

## Założenia

1. **Bez backendu.** Aplikacja jest w pełni statyczna. Dzięki temu hosting jest darmowy
   (GitHub Pages), nie ma kont ani kosztów utrzymania, a dane użytkownika nie opuszczają jego
   urządzenia.
2. **Local-first.** Stan aplikacji zapisujemy lokalnie w przeglądarce. Brak synchronizacji
   to świadomy kompromis, który łagodzimy eksportem i importem kopii zapasowej.
3. **Logika oddzielona od UI.** Obliczenia (kalorie, porcje, sumowanie zakupów) żyją w `src/domain`
   jako czyste funkcje. Nie importują Reacta, więc łatwo je testować.
4. **Działa offline.** Aplikacja jest PWA, a service worker przechowuje zasoby w pamięci podręcznej.

## Struktura katalogów

| Katalog          | Odpowiedzialność                                                                      |
| ---------------- | ------------------------------------------------------------------------------------- |
| `src/app`        | Powłoka: tabela tras (`App.tsx`), układ strony (`AppLayout.tsx`), definicja nawigacji |
| `src/features`   | Jeden podkatalog na obszar funkcjonalny. Tu trafiają ekrany i ich komponenty          |
| `src/components` | Komponenty współdzielone przez kilka funkcji                                          |
| `src/domain`     | Czysta logika biznesowa i typy domenowe                                               |
| `src/data`       | Baza IndexedDB (Dexie) i repozytoria. Jedyne miejsce, które zna bibliotekę bazy       |
| `src/styles`     | Zmienne projektowe (kolory, czcionki) i style globalne                                |
| `src/test`       | Wspólna konfiguracja testów                                                           |

Zasady zależności: `features` mogą korzystać z `components`, `data` i `domain`. `data` zna
tylko `domain`, a `domain` nie zależy od niczego poza standardową biblioteką. `app` składa
całość w jedną aplikację.

## Routing

Używamy `HashRouter` z React Routera, więc adresy wyglądają jak `/#/kalendarz`. GitHub Pages
nie potrafi przekierować nieznanej ścieżki na `index.html`, więc przy zwykłym `BrowserRouter`
odświeżenie strony kończyłoby się błędem 404.

Komponent `App` zawiera wyłącznie tabelę tras. Router dostarcza wywołujący: `HashRouter`
w `main.tsx` i `MemoryRouter` w testach.

## PWA

Manifest i service worker generuje `vite-plugin-pwa` (konfiguracja w `vite.config.ts`).
Tryb `autoUpdate` pobiera nową wersję w tle i aktywuje ją przy kolejnym otwarciu aplikacji.

Ikony PNG powstają z `public/favicon.svg` poleceniem `npm run generate-pwa-assets` i są
zapisane w repozytorium, żeby build nie zależał od generatora.

### Ścieżka bazowa

GitHub Pages serwuje projekt spod `/<nazwa-repozytorium>/`. Ścieżkę bazową przekazuje zmienna
środowiskowa `VITE_BASE_PATH`, ustawiana w workflow wdrożenia. Lokalnie zmienna nie jest
potrzebna, a aplikacja działa spod `/`.

## Warstwa danych

Dane użytkownika (domownicy, a później własne przepisy, plan posiłków i pomiary) trafiają do
IndexedDB, bo `localStorage` ma mały limit i nie nadaje się do danych strukturalnych.
IndexedDB opakowuje [Dexie](https://dexie.org). Daje typowane tabele, transakcje, wersjonowanie
schematu oraz `useLiveQuery`, dzięki któremu ekrany odświeżają się same po zmianie danych.

Zasady:

- Baza (`src/data/db.ts`) i repozytoria (np. `memberRepository.ts`) są jedynym miejscem, które
  zna Dexie. Reszta aplikacji woła funkcje repozytorium albo hooki, np. `useMembers`.
- Rekord w bazie może mieć pola techniczne (np. `createdAt`), których nie ma w modelu domenowym.
  Repozytorium kopiuje pola jawnie, żeby takie dane nie wyciekały do aplikacji.
- Schemat zmieniamy wyłącznie przez dodanie nowego `version(n)` z funkcją migracji, nigdy przez
  edycję istniejącej wersji, bo dane użytkowników już leżą na ich urządzeniach.
- Identyfikatory to `crypto.randomUUID()`. Są stabilne, więc przydadzą się przy eksporcie
  i imporcie kopii zapasowej.
- Po pierwszym zapisie prosimy przeglądarkę o trwały magazyn (`navigator.storage.persist()`),
  żeby nie kasowała danych przy braku miejsca. Przeglądarka może odmówić i to nie jest błąd.
- Testy używają `fake-indexeddb`, instalowanego globalnie w `src/test/setup.ts`.

Model domenowy (na razie zaimplementowany jest tylko `Member`, w `src/domain/household`):

| Encja       | Opis                                                               |
| ----------- | ------------------------------------------------------------------ |
| `Member`    | Domownik: imię, płeć, wiek, wzrost, waga, aktywność, cel           |
| `Recipe`    | Przepis: nazwa, rodzaj posiłku, składniki, kalorie, makroskładniki |
| `PlanEntry` | Wpis w kalendarzu: data, rodzaj posiłku, przepis, kto je posiłek   |
| `Measure`   | Pomiar wagi lub obwodu w danym dniu                                |

## Testy

- **Logika domenowa:** testy jednostkowe obok kodu (`*.test.ts`). Obliczenia mają testy
  z ręcznie wyliczonymi wartościami oczekiwanymi.
- **Interfejs:** testy `*.test.tsx` oparte na Testing Library. Sprawdzają to, co widzi
  użytkownik (role, nazwy, widoczność), a nie szczegóły implementacji.
- Vitest działa bez globalnych funkcji (`describe`, `it` importujemy jawnie).

## Konwencje

- **Język:** kod, nazwy i komentarze po angielsku. Teksty interfejsu i dokumentacja po polsku.
- **Komentarze** wyjaśniają, dlaczego coś jest zrobione, a nie co robi kod.
- **Typy:** TypeScript w trybie `strict`, bez `any`.
- **Style:** zwykły CSS obok komponentów, bez frameworka. Kolory i czcionki pochodzą wyłącznie
  ze zmiennych w `src/styles/index.css`. Jest obsługa trybu ciemnego i `prefers-reduced-motion`.
- **Dostępność:** semantyczny HTML, widoczny fokus, link „Przejdź do treści”, etykiety ARIA tam,
  gdzie sama treść nie wystarcza.
- **Formularze:** kontrolowane pola, a walidacja to czysta funkcja w `domain` zwracająca kody
  problemów (`required`, `invalid`). Komunikaty po polsku mapuje dopiero interfejs. Przy błędzie
  fokus trafia do pierwszego błędnego pola, a pole ma `aria-invalid` i opis błędu.
- **Zewnętrzne zasoby:** brak. Używamy czcionek systemowych, więc przeglądarka niczego
  nie pobiera z zewnętrznych serwerów.
