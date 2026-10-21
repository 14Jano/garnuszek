# Historia zmian

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), a wersjonowanie
na [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

## [0.4.0] - 2026-10-21

### Dodano

- Kalendarz posiłków: widok tygodnia z wyborem dnia, nawigacją po tygodniach i przyciskiem „Dziś”.
- Planowanie śniadania, obiadu i kolacji na każdy dzień. Dni z zaplanowanymi posiłkami są
  oznaczone.
- Porcje liczone osobno dla każdego domownika według jego dziennego celu, wraz z łączną ilością do
  ugotowania i listą składników dla wszystkich.
- Wymiana dania jednym kliknięciem (zachowuje osoby jedzące) oraz usuwanie dania z planu.
- Odznaczanie osób, które nie jedzą danego posiłku.
- Podsumowanie dnia: kalorie każdej osoby w porównaniu z jej dziennym celem.
- Wersja 3 schematu bazy (tabela `planEntries`). Usunięcie domownika albo własnego przepisu czyści
  plan w jednej transakcji.
- Operacje na dniach kalendarzowych (`src/domain/plan/dates.ts`) z testami, także na dzień zmiany
  czasu.

### Zmieniono

- Hooki `useMembers` i `useRecipeEntries` przeniesiono do `src/hooks`, żeby ekrany nie importowały
  się nawzajem.

## [0.3.0] - 2026-10-21

### Dodano

- Ekran „Przepisy”: lista 32 wbudowanych dań z kaloriami na porcję, wyszukiwanie po nazwie
  i składnikach (bez względu na polskie znaki), filtry po posiłku i diecie oraz ulubione.
- Widok przepisu z wartościami odżywczymi na porcję, składnikami i krokami przygotowania.
- Własne przepisy: dodawanie, edycja i usuwanie, z kaloriami liczonymi na żywo.
- Katalog 72 składników z wartościami odżywczymi na 100 g (`src/content`).
- Wyliczanie diet (wegetariańska, wegańska, peskatariańska) z grup żywności składników.
- Wersja 2 schematu bazy (tabele `customRecipes` i `favorites`) wraz z testem migracji.
- Testy spójności danych: znane składniki, kalorie zgodne z makroskładnikami, realistyczne porcje.
- Dokument [docs/DATA.md](docs/DATA.md) o pochodzeniu danych i dodawaniu składników i przepisów.

### Zmieniono

- Wspólne sprawdzanie zakresu liczb wydzielono do `src/domain/validation.ts`.

## [0.2.0] - 2026-10-21

### Dodano

- Ekran „Domownicy”: dodawanie, edycja i usuwanie osób, z dziennym zapotrzebowaniem kalorycznym.
- Walidacja danych domownika w warstwie domenowej (`src/domain/household`).
- Dla osób poniżej 18. roku życia dostępny jest wyłącznie cel „utrzymać wagę”.
- Lokalny zapis danych w IndexedDB przez Dexie (`src/data`), z prośbą o trwały magazyn.
- Wspólne style przycisków i pól formularza oraz komponenty `Callout` i `HealthDisclaimer`.

### Zmieniono

- Komunikat o orientacyjnym charakterze wyliczeń jest teraz komponentem wielokrotnego użytku.

## [0.1.0] - 2026-10-21

### Dodano

- Szkielet aplikacji: React 19, TypeScript, Vite, React Router (`HashRouter`).
- Powłoka aplikacji z dolną nawigacją, trybem ciemnym i linkiem „Przejdź do treści”.
- Ekrany zastępcze: kalendarz, zakupy, przepisy, domownicy, ustawienia.
- Konfiguracja PWA (manifest, service worker, ikony).
- Kalkulator dziennego zapotrzebowania kalorycznego (`src/domain/nutrition`) z testami.
- ESLint, Prettier, Vitest i Testing Library.
- GitHub Actions: sprawdzanie jakości (CI) i wdrożenie na GitHub Pages.
- Dokumentacja: README, architektura, opis wzorów żywieniowych, zasady współpracy.
