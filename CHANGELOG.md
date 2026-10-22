# Historia zmian

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), a wersjonowanie
na [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

## [1.2.0] - 2026-10-22

### Dodano

- Wykluczenia domowników: w formularzu sekcja „Czego unika” z dietą (wegetariańska, wegańska,
  peskatariańska), alergenami i nietolerancjami (gluten, mleko i nabiał, jajka, ryby, orzeszki
  ziemne, orzechy, soja, sezam) oraz dowolnymi składnikami z katalogu. Karta domownika wypisuje, czego
  unika.
- Kalendarz ostrzega przy posiłku, w którym jest coś, czego unika ktoś z jedzących, i mówi co: „Anna:
  mleko i nabiał (masło, ser żółty)”. Ostrzeżenie znika, gdy tę osobę wykreślisz z „Kto je”.
- Wybór dania domyślnie ukrywa dania, których ktoś z jedzących unika, mówi, ile ukrył, i pozwala je
  pokazać razem z ostrzeżeniem.
- Alergeny w katalogu składników (jedna tabela do przeglądu) i testy, które pilnują, żeby zgadzały się
  z grupą żywności: każdy nabiał ma mleko, każde pieczywo i makaron gluten itd.
- Kopia zapasowa w wersji 3 zawiera wykluczenia. Pliki w wersji 1 i 2 nadal się wczytują, a składniki,
  których aplikacja już nie zna, są pomijane i policzone na ekranie wczytywania.
- Opis w [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA.md](docs/DATA.md) i
  [docs/BACKUP.md](docs/BACKUP.md).

### Naprawiono

- Edycja domownika zapisuje cały rekord. Wcześniej pole, które użytkownik wyczyścił (np. docelowa
  waga po zmianie celu na „utrzymać wagę”), zostawało w bazie ze starą wartością.

## [1.1.0] - 2026-10-22

### Dodano

- Lista zakupów podaje ilości tak, jak kupuje się je w sklepie: jajka, banany, papryki i awokado
  w sztukach, czosnek i sałatę w główkach, ciecierzycę, pomidory i tuńczyka w puszkach, masło,
  twaróg i tofu w opakowaniach, chleb w bochenkach, a mleko, oliwę i olej w litrach i mililitrach.
  Całe sztuki są zaokrąglane w górę, bo sklep nie sprzeda pół jajka.
- Przy puszkach, opakowaniach i bochenkach lista dopisuje, ile jest naprawdę potrzebne („2 puszki,
  potrzeba ok. 435 g”), bo rozmiary w sklepach bywają różne. To samo trafia do skopiowanej i
  wysłanej listy.
- Odmiana po polsku (1 puszka, 3 puszki, 5 puszek, 22 puszki).
- Składniki mogą mieć `purchase` (waga sztuki, puszki, opakowania) lub `gramsPerMl` (płyny). Opis
  w [docs/DATA.md](docs/DATA.md), a testy pilnują, żeby wagi i gęstości były wiarygodne.
- Zrzuty ekranu w README (w `docs/screenshots`).

### Zmieniono

- Przepisy, kalendarz i dane użytkownika nadal liczą w gramach. Zmieniła się tylko lista zakupów,
  więc baza i kopia zapasowa pozostały bez zmian.
- Przy dużym tekście ilość na liście zakupów zawija się zamiast wypychać wiersz poza ekran.

### Naprawiono

- Na ekranie pomiarów brakowało kropki po „Cel: 62 kg”, więc zdanie o tym, ile zostało do celu,
  zlewało się z poprzednim.

## [1.0.0] - 2026-10-22

Pierwsza stabilna wersja. Wszystkie funkcje z planu są gotowe, a ta wersja je dopracowuje: dostępność
i zachowanie aplikacji, gdy coś pójdzie nie tak.

### Dodano

- Tytuł karty zgodny z nagłówkiem ekranu (np. „Pomiary: Anna – Garnuszek”), także w historii
  przeglądarki i dla czytników ekranu.
- Po przejściu na inny ekran fokus trafia na jego nagłówek, więc czytnik ekranu mówi, gdzie jesteśmy,
  a użytkownik klawiatury zaczyna od góry nowego ekranu. Zmiana dnia lub tygodnia fokusu nie rusza.
- Fokus nie ginie w potwierdzeniach usuwania (domownik, przepis, pomiar, wszystkie dane): trafia na
  „Anuluj”, a po anulowaniu wraca na przycisk wyjściowy. Podobnie przy przełączaniu listy domowników
  i formularza oraz przy podglądzie kopii zapasowej.
- Czytelny komunikat zamiast pustej strony, gdy ekran się wywróci, także gdy przeglądarka nie pozwala
  zapisywać danych (tryb prywatny, brak miejsca, baza zapisana przez nowszą wersję). Reszta aplikacji
  działa dalej, a błąd trafia do konsoli.
- Informacja dla przeglądarek z wyłączonym JavaScriptem.
- Automatyczna kontrola dostępności: reguły axe-core na każdym ekranie (z danymi i bez), testy tytułów
  i fokusu oraz test kontrastu kolorów dla jasnego i ciemnego motywu.
- Dokument [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md): co jest zrobione, jak to sprawdzamy, czego
  to nie obejmuje i lista kontrolna dla nowych ekranów.

### Zmieniono

- Ciemny motyw: jaśniejsze obramowanie pól i przycisków na kartach (kontrast 3:1 zamiast 2,8:1).
- Układ przy szerokości 320 px i tekście powiększonym do 200% nie wychodzi poza ekran: dolna
  nawigacja i pasek dni tygodnia przewijają się, a pozostałe elementy się zawijają (pasek tygodnia,
  lista wyboru dania, karty przepisów, wiersze składników, formularz pomiaru, lista zakupów).
- Adres repozytorium jest w jednym miejscu (`src/content/project.ts`).

### Usunięto

- Nieużywany komponent `PagePlaceholder`.

## [0.8.0] - 2026-10-21

### Dodano

- Ekran pomiarów domownika (`/domownicy/:id/pomiary`), do którego prowadzi przycisk „Pomiary
  i postępy” na karcie domownika. Zapisujesz wagę, talię, biodra i obwód klatki piersiowej z datą.
  Kolejny pomiar z tego samego dnia zastępuje poprzedni, a formularz uprzedza o tym.
- Wykres postępu narysowany jako SVG, z opisem słownym dla czytników ekranu, oraz podsumowanie:
  pierwszy i ostatni pomiar, zmiana. Lista pomiarów z usuwaniem po potwierdzeniu.
- Docelowa waga w profilu domownika (pole pojawia się przy celu „schudnąć” i „przytyć”). Ekran
  pomiarów pokazuje przerywaną linię celu, ile zostało do celu i pasek postępu.
- Prognoza osiągnięcia celu na podstawie tempa z ostatnich ośmiu tygodni. Gdy daty nie da się
  rzetelnie podać (za mało danych, waga stoi w miejscu lub oddala się od celu, cel za dwa lata),
  aplikacja mówi dlaczego.
- Waga domownika jest zawsze wagą z jego ostatniego ważenia, więc dzienne zapotrzebowanie i porcje
  liczą się od aktualnej wagi.
- Kopia zapasowa w wersji 2 zawiera pomiary i docelową wagę. Pliki w wersji 1 nadal się wczytują.
  Ekran wczytywania pokazuje liczbę pomiarów.
- Wersja 6 schematu bazy (tabela `measurements`). Usunięcie domownika usuwa jego pomiary.
- Opis prognozy w [docs/NUTRITION.md](docs/NUTRITION.md), sekcja o pomiarach w
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) i opis wersji 2 pliku w [docs/BACKUP.md](docs/BACKUP.md).

### Zmieniono

- Zapis liczb z przecinkiem (`formatDecimal`, `formatChange`) i dłuższe formaty dat trafiły do
  wspólnych funkcji w `src/format` i `src/domain/plan/dates.ts`.
- Waga na karcie domownika jest zapisywana z przecinkiem (68,5 kg), bo ważenia dają wartości
  ułamkowe.

## [0.7.0] - 2026-10-21

### Dodano

- Kopia zapasowa w Ustawieniach: pobranie wszystkich danych (domownicy, własne przepisy, ulubione,
  plan, odhaczone zakupy, przekąski) jako pliku JSON oraz wczytanie takiego pliku, także na innym
  urządzeniu. Wczytanie pokazuje, co jest w pliku, i pyta o potwierdzenie, bo zastępuje dane.
- Ścisła walidacja wczytywanego pliku tymi samymi regułami co formularze. Uszkodzony plik jest
  odrzucany z informacją, gdzie jest problem, a odwołania do rzeczy, których aplikacja już nie zna,
  są pomijane i policzone.
- Wczytanie kopii odbywa się w jednej transakcji: przy błędzie dane na urządzeniu zostają
  nietknięte.
- Usuwanie wszystkich danych z urządzenia, z potwierdzeniem.
- Informacje o aplikacji: wersja (z `package.json`), licencja, odnośnik do kodu i zastrzeżenie
  zdrowotne.
- Dokument [docs/BACKUP.md](docs/BACKUP.md) z opisem formatu pliku.

### Zmieniono

- Listy płci, poziomów aktywności i celów przeniesiono do warstwy domenowej, bo korzysta z nich
  walidacja kopii.

## [0.6.0] - 2026-10-21

### Dodano

- „Co ugotować z tego, co mam”: wybierasz składniki, które masz w domu, a lista przepisów
  pokazuje dania zawierające wszystkie z nich. Filtr łączy się z wyszukiwaniem, posiłkiem, dietą
  i ulubionymi.
- Budżet kalorii na przekąski: pole w profilu domownika (0–1000 kcal dziennie) oraz możliwość
  zmiany go na jeden dzień w kalendarzu, z przyciskiem „Przywróć domyślne”. Porcje posiłków
  zmniejszają się o tyle, ile idzie na przekąski, a podsumowanie dnia je uwzględnia. Przekąski nie
  zajmą więcej niż połowy dziennego celu.
- Gotowanie na zapas: jedno danie na 2–4 dni (pole „Gotuj na”). Kolejne dni stają się resztkami,
  z własną listą osób i porcji. Dania zaplanowane na te dni przesuwają się na później, a powrót do
  jednego dnia przywraca plan sprzed wydłużenia.
- Przy daniu ugotowanym na zapas kalendarz pokazuje, ile ugotować dla wszystkich dni razem, i do
  kiedy starczy resztek. W dniach z resztkami jest odnośnik do dnia gotowania.
- Lista zakupów kupuje składniki całego dania w tygodniu, w którym jest gotowane, także gdy resztki
  wypadają w następnym tygodniu.
- Wersja 5 schematu bazy (tabela `snackOverrides` i indeks `batchId`).

### Zmieniono

- Wybór składnika wydzielono do wspólnego komponentu `IngredientOptions`.
- Wymiana dania i usunięcie dotyczą całego dania ugotowanego na kilka dni. Samych resztek nie
  można wymienić ani usunąć, trzeba to zrobić w dniu gotowania.

## [0.5.0] - 2026-10-21

### Dodano

- Lista zakupów na tydzień: składniki wszystkich zaplanowanych posiłków, zsumowane z uwzględnieniem
  porcji każdego domownika, z wagami zaokrąglonymi do 5 g (od 1 kg w kilogramach).
- Podział na działy według grup żywności, w kolejności przechodzenia przez sklep, z produktami
  posortowanymi po polsku.
- Odhaczanie produktów w sklepie z licznikiem „Kupione: x z y”. Odhaczenia są zapisywane osobno
  dla każdego tygodnia, a przycisk „Odznacz wszystko” czyści listę.
- Udostępnianie listy: arkusz udostępniania (tam, gdzie przeglądarka go ma), kopiowanie do
  schowka i wysyłka przez WhatsApp. Tekst zawiera tylko to, co zostało do kupienia.
- Nawigacja po tygodniach na liście zakupów oraz link z kalendarza do listy tego tygodnia.
- Wersja 4 schematu bazy (tabela `shoppingChecks`).

### Zmieniono

- Selektor tygodnia wydzielono do wspólnego komponentu `WeekSwitcher`. Przycisk „Dziś” nie jest
  już podkreślony.
- Etykiety (posiłki, diety, grupy żywności) przeniesiono do `src/content/labels.ts`, a zapis ilości
  do `src/format`, żeby ekrany nie importowały się nawzajem.
- Kolejność grup żywności (`INGREDIENT_CATEGORIES`) jest teraz częścią warstwy domenowej.

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
