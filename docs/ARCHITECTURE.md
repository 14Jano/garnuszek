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
| `src/styles`     | Zmienne projektowe (kolory, czcionki) i style globalne                                |
| `src/test`       | Wspólna konfiguracja testów                                                           |

Zasady zależności: `features` mogą korzystać z `components` i `domain`, `domain` nie zależy
od niczego poza standardową biblioteką, a `app` składa całość w jedną aplikację.

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

## Warstwa danych (planowana)

Dane użytkownika (domownicy, własne przepisy, plan posiłków, pomiary) trafią do IndexedDB,
bo `localStorage` ma mały limit i nie nadaje się do danych strukturalnych. Wybór biblioteki
opakowującej IndexedDB zapadnie przy implementacji i zostanie opisany w tym dokumencie.

Wstępny model domenowy:

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
- **Zewnętrzne zasoby:** brak. Używamy czcionek systemowych, więc przeglądarka niczego
  nie pobiera z zewnętrznych serwerów.
