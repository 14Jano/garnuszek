# Współpraca

Dzięki, że chcesz pomóc w rozwoju Garnuszka! Ten dokument opisuje, jak zacząć.

## Środowisko

Potrzebujesz [Node.js](https://nodejs.org) 22 lub nowszego (zalecana wersja jest w `.nvmrc`).

```bash
npm install
npm run dev
```

## Zanim wyślesz zmiany

Uruchom komplet sprawdzeń. To samo robi CI w każdym pull requeście.

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Do formatowania użyj `npm run format`.

## Zasady dotyczące kodu

- **Język:** kod i komentarze po angielsku, teksty interfejsu i dokumentacja po polsku.
- **TypeScript** w trybie `strict`, bez `any`.
- **Logika domenowa** trafia do `src/domain` jako czyste funkcje (bez Reacta) i musi mieć testy.
- **Komentarze** piszemy tam, gdzie wyjaśniają _dlaczego_. Nie opisujemy tego, co widać w kodzie.
- **Testy interfejsu** sprawdzają to, co widzi użytkownik, a nie szczegóły implementacji.
- **Dostępność:** semantyczny HTML, widoczny fokus, kontrast zgodny z WCAG AA. Nowy ekran dodaj do
  `src/app/accessibility.test.tsx`, a listę rzeczy do sprawdzenia znajdziesz w
  [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).
- **Dane użytkownika** zostają na jego urządzeniu. Nie dodajemy analityki, śledzenia ani
  zewnętrznych zapytań bez wcześniejszej dyskusji.
- **Nowe dane użytkownika** (nowa tabela, nowe pole) trzeba dopisać do kopii zapasowej: do
  `exportBackup`, `importBackup`, `parseBackup` i do [docs/BACKUP.md](docs/BACKUP.md). Jeśli nowa
  wersja pliku nie jest czytelna dla starszej wersji aplikacji, podnieś `BACKUP_VERSION`.

Zasady dotyczące architektury opisuje [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Commity i pull requesty

Piszemy komunikaty w stylu [Conventional Commits](https://www.conventionalcommits.org):

```text
feat(household): add member form
fix(calendar): keep portions after swapping a meal
docs: describe backup format
```

Najczęstsze typy: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Pull request powinien być mały i skupiony na jednej sprawie. Opisz, co i dlaczego zmieniasz,
oraz dopisz wpis do sekcji `Unreleased` w [CHANGELOG.md](CHANGELOG.md).

## Zrzuty ekranu

Zrzuty w README (`docs/screenshots`) pokazują dane przykładowe: rodzinę z trojgiem domowników
(w tym dzieckiem), zaplanowany tydzień, kilka odhaczonych zakupów i osiem tygodni pomiarów wagi.
Robimy je w jasnym motywie, w widoku telefonu 375 × 812 px. Gdy zmienia się wygląd ekranu, odśwież
odpowiedni zrzut tak samo, żeby README nie pokazywało nieaktualnej aplikacji.

## Treści (przepisy)

Przepisy w bazie muszą być autorskie albo pochodzić ze źródeł o zgodnej licencji. Nie kopiuj
przepisów, zdjęć ani opisów z innych aplikacji i stron. Wartości odżywcze składników pochodzą
z otwartych baz (np. USDA FoodData Central, Open Food Facts), a źródło trzeba podać.

Jak dodać składnik albo przepis, opisuje [docs/DATA.md](docs/DATA.md). Testy w `src/content`
sprawdzają spójność danych (znane składniki, kalorie zgodne z makroskładnikami, realistyczne
porcje), więc literówkę w liczbie wychwycą jeszcze przed wysłaniem zmian.
