# Historia zmian

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), a wersjonowanie
na [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

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
