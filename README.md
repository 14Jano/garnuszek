# Garnuszek

Darmowy planer posiłków dla całej rodziny. Układasz jadłospis w kalendarzu, porcje liczą się osobno
dla każdego domownika, a lista zakupów powstaje sama z tego, co zaplanowałeś.

Garnuszek działa w przeglądarce jako aplikacja PWA, więc można go zainstalować na telefonie bez
sklepu z aplikacjami. Nie ma kont, serwera, reklam ani płatnych planów. Wszystkie funkcje są dla
wszystkich.

> **Status: wczesny etap (v0.2).** Gotowe są szkielet aplikacji, nawigacja, konfiguracja PWA oraz
> ekran domowników z lokalnym zapisem danych i wyliczaniem dziennego zapotrzebowania kalorycznego.
> Pozostałe ekrany są jeszcze w budowie. Zobacz [plan prac](#plan-prac).

## Dlaczego Garnuszek

- **Za darmo, na zawsze.** Bez subskrypcji, limitów dań, limitów osób i limitów własnych przepisów.
- **Bez konta.** Nie zbieramy żadnych danych. Wszystko zapisuje się lokalnie na Twoim urządzeniu.
- **Dla rodziny.** Jedno danie, a porcja dla każdego liczona według jego potrzeb.
- **Otwarty kod.** Możesz sprawdzić, jak to działa, zgłosić błąd albo dołożyć swoją cegiełkę.

## Funkcje

| Funkcja                                                       | Status    |
| ------------------------------------------------------------- | --------- |
| Szkielet aplikacji, nawigacja, instalacja jako PWA            | Gotowe    |
| Kalkulator dziennego zapotrzebowania kalorycznego (logika)    | Gotowe    |
| Domownicy: profil, cel, dzienne zapotrzebowanie               | Gotowe    |
| Lokalny zapis danych w przeglądarce (IndexedDB)               | Gotowe    |
| Przepisy: baza dań, własne przepisy, kalorie i makroskładniki | Planowane |
| Kalendarz posiłków z przeliczaniem porcji                     | Planowane |
| Wymiana dania jednym kliknięciem                              | Planowane |
| Lista zakupów podzielona na działy                            | Planowane |
| „Co ugotować z tego, co mam”                                  | Planowane |
| Gotowanie na zapas (jedno danie na kilka dni)                 | Planowane |
| Budżet kalorii na przekąski                                   | Planowane |
| Kopia zapasowa: eksport i import do pliku                     | Planowane |
| Waga i pomiary z wykresem postępu                             | Planowane |

## Technologie

- [React](https://react.dev) 19 i [TypeScript](https://www.typescriptlang.org) w trybie `strict`
- [Vite](https://vite.dev) jako narzędzie do budowania
- [React Router](https://reactrouter.com) (`HashRouter`, dzięki temu działa na statycznym hostingu)
- [Dexie](https://dexie.org) jako opakowanie IndexedDB (lokalny zapis danych)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) do manifestu i trybu offline
- [Vitest](https://vitest.dev) i [Testing Library](https://testing-library.com) do testów
- ESLint i Prettier do pilnowania jakości i stylu kodu

## Szybki start

Wymagania: [Node.js](https://nodejs.org) 22 lub nowszy (zalecana wersja z pliku `.nvmrc`).

```bash
npm install
npm run dev
```

Aplikacja uruchomi się pod adresem <http://localhost:5173>.

### Dostępne skrypty

| Polecenie                     | Co robi                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `npm run dev`                 | Serwer deweloperski z odświeżaniem na żywo               |
| `npm run build`               | Sprawdzenie typów i build produkcyjny do katalogu `dist` |
| `npm run preview`             | Podgląd builda produkcyjnego                             |
| `npm test`                    | Jednorazowe uruchomienie testów                          |
| `npm run test:watch`          | Testy w trybie ciągłym                                   |
| `npm run lint`                | ESLint                                                   |
| `npm run typecheck`           | Samo sprawdzenie typów TypeScript                        |
| `npm run format`              | Formatowanie kodu Prettierem                             |
| `npm run format:check`        | Sprawdzenie formatowania bez zmian w plikach             |
| `npm run generate-pwa-assets` | Ponowne wygenerowanie ikon PNG z `public/favicon.svg`    |

## Struktura projektu

```text
src/
  app/          Powłoka aplikacji: routing, układ strony, nawigacja
  components/   Wspólne komponenty UI
  features/     Ekrany podzielone tematycznie (kalendarz, zakupy, przepisy...)
  domain/       Czysta logika biznesowa bez Reacta (np. obliczenia kalorii)
  data/         Baza IndexedDB i repozytoria, jedyne miejsce, które zna Dexie
  styles/       Zmienne projektowe i style globalne
  test/         Konfiguracja testów
docs/           Dokumentacja techniczna
public/         Ikony i pliki statyczne
```

Szczegóły i uzasadnienie decyzji znajdziesz w [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Wzory użyte do obliczania kalorii opisuje [docs/NUTRITION.md](docs/NUTRITION.md).

## Dane i prywatność

Garnuszek nie wysyła nic na żaden serwer i nie wymaga konta. Domownicy (a docelowo także przepisy,
plan posiłków i pomiary) są zapisywani w bazie IndexedDB w przeglądarce na Twoim urządzeniu.

Wada tego podejścia jest taka, że wyczyszczenie danych przeglądarki albo zmiana telefonu oznacza
utratę danych. Safari na iPhonie może dodatkowo usuwać dane stron, z którymi nie było kontaktu przez
7 dni. Dotyczy to zwykłych kart przeglądarki, a nie aplikacji dodanych do ekranu głównego, więc na
iPhonie warto zainstalować Garnuszka. W planach jest eksport i import kopii zapasowej do pliku.

## Zastrzeżenie zdrowotne

Wyliczenia kalorii są orientacyjne i dotyczą zdrowych osób. Garnuszek nie zastępuje porady lekarza
ani dietetyka i nie jest przeznaczony dla kobiet w ciąży ani karmiących piersią. Przy chorobach
(np. cukrzycy, insulinooporności) plan żywieniowy skonsultuj ze specjalistą. Dla osób poniżej 18.
roku życia aplikacja dopuszcza wyłącznie cel „utrzymać wagę”.

## Wdrożenie na GitHub Pages

Repozytorium zawiera gotowy workflow `.github/workflows/deploy.yml`. Po wypchnięciu kodu na GitHuba:

1. Wejdź w **Settings → Pages** i jako źródło (**Source**) wybierz **GitHub Actions**.
2. Wypchnij zmiany do gałęzi `main`. Workflow zbuduje aplikację i opublikuje ją pod adresem
   `https://<twoja-nazwa>.github.io/<nazwa-repozytorium>/`.

Ścieżka bazowa jest ustawiana automatycznie na podstawie nazwy repozytorium (zmienna
`VITE_BASE_PATH`). Lokalnie aplikacja działa spod `/`.

## Plan prac

- [x] **0.1** Szkielet projektu, nawigacja, PWA, kalkulator kalorii
- [x] **0.2** Domownicy: formularz profilu i lokalny zapis danych
- [ ] **0.3** Przepisy: baza dań, własne przepisy, kalorie i makroskładniki
- [ ] **0.4** Kalendarz posiłków, wymiana dań, przeliczanie porcji
- [ ] **0.5** Lista zakupów
- [ ] **0.6** Wyszukiwanie po składnikach, gotowanie na zapas, budżet na przekąski
- [ ] **0.7** Kopia zapasowa (eksport i import)
- [ ] **0.8** Waga i pomiary
- [ ] **1.0** Dostępność, dopracowanie i stabilizacja

Historię zmian znajdziesz w [CHANGELOG.md](CHANGELOG.md).

## Współpraca

Chcesz pomóc? Przeczytaj [CONTRIBUTING.md](CONTRIBUTING.md). Zgłoszenia błędów i pomysły
zostawiaj w zakładce **Issues**.

## Licencja

[MIT](LICENSE). Możesz swobodnie używać, kopiować i modyfikować ten kod.
