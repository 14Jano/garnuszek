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
| `src/content`    | Wbudowane dane: katalog składników i przepisy (zwykłe moduły TypeScript)              |
| `src/hooks`      | Hooki Reacta, które łączą bazę (`data`) i dane wbudowane (`content`) z ekranami       |
| `src/format`     | Zapis liczb i ilości w interfejsie (np. gramy jako „1,2 kg”)                          |
| `src/styles`     | Zmienne projektowe (kolory, czcionki) i style globalne                                |
| `src/test`       | Wspólna konfiguracja testów                                                           |

Zasady zależności: `features` mogą korzystać z `components`, `content`, `data`, `domain`,
`format` i `hooks`. `hooks` łączą `data` i `content` z Reactem, a `data`, `content` i `format`
znają tylko `domain`.
`domain` nie zależy od niczego poza standardową biblioteką. `app` składa całość w jedną
aplikację. Ekrany nie importują się nawzajem: to, czego potrzebuje kilka z nich (np. lista
domowników albo przepisów), trafia do `hooks` albo `components`.

## Routing

Używamy `HashRouter` z React Routera, więc adresy wyglądają jak `/#/kalendarz`. GitHub Pages
nie potrafi przekierować nieznanej ścieżki na `index.html`, więc przy zwykłym `BrowserRouter`
odświeżenie strony kończyłoby się błędem 404.

Komponent `App` zawiera wyłącznie tabelę tras. Router dostarcza wywołujący: `HashRouter`
w `main.tsx` i `MemoryRouter` w testach.

Ekran przepisów ma podstrony: `/przepisy` (lista), `/przepisy/nowy` (formularz), `/przepisy/:id`
(szczegóły) i `/przepisy/:id/edytuj` (edycja własnego przepisu). Adresy buduje obiekt
`recipePath` z `src/app/navigation.ts`, żeby nie powtarzać ich w komponentach.

Kalendarz ma adresy `/kalendarz` (dziś), `/kalendarz/:data` (wybrany dzień, np. `2026-10-21`)
i `/kalendarz/:data/:posiłek/wybierz` (wybór lub wymiana dania). Adresy buduje `calendarPath`.
Błędna data w adresie jest zastępowana dzisiejszą.

Lista zakupów ma adresy `/zakupy` (ten tydzień) i `/zakupy/:data` (tydzień zawierający dzień),
budowane przez `shoppingPath`. Selektor tygodnia (`WeekSwitcher`) jest wspólnym komponentem
kalendarza i listy zakupów, a każdy z nich przekazuje własną funkcję budującą adresy.

Pomiary domownika mają adres `/domownicy/:id/pomiary`, budowany przez `householdPath`. Prowadzi do
niego przycisk na karcie domownika. Nieznany identyfikator pokazuje komunikat z odnośnikiem do
listy domowników.

## Powłoka: tytuł, fokus i błędy

Układ strony (`AppLayout`) zajmuje się tym, czego aplikacja jednostronicowa nie dostaje od
przeglądarki za darmo. Opis dla użytkownika jest w [ACCESSIBILITY.md](ACCESSIBILITY.md), tu wersja
techniczna.

- **Tytuł i fokus.** Hook `usePageHeading` obserwuje `<main>` (`MutationObserver`) i bierze tytuł
  karty z `<h1>` aktualnego ekranu. Obserwuje, a nie czyta raz, bo ekran pokazuje nagłówek dopiero po
  wczytaniu danych. Gdy zmienia się ekran, przenosi fokus na jego `<h1>`. „Ekran” to ścieżka bez dat
  (`viewOf`), więc zmiana dnia w kalendarzu albo tygodnia na liście zakupów fokusu nie rusza. Dzięki
  temu żaden ekran nie musi o tym pamiętać, a tytuł zawsze zgadza się z nagłówkiem.
- **Fokus wewnątrz ekranu** załatwiają dwa małe hooki z `src/hooks`: `useConfirmFocus` (potwierdzenie
  dwuetapowe: fokus na „Anuluj”, a po anulowaniu z powrotem na przycisku wyjściowym) i
  `useFocusWhenChanged` (część ekranu podmieniana w miejscu, np. formularz zamiast listy).
- **Błędy.** `ErrorBoundary` otacza treść ekranu (nie cały układ), więc nawigacja działa nawet po
  awarii ekranu. Wraca do normy po przejściu na inną ścieżkę (`resetKey`), bez ponownego montowania
  zdrowych ekranów. Zapytania na żywo z Dexie rzucają błąd podczas renderowania, więc odmowę
  przeglądarki (tryb prywatny, zablokowane dane witryn, brak miejsca, baza zapisana przez nowszą
  wersję) łapie ten sam mechanizm. `explainError` zamienia je na zdanie zrozumiałe dla człowieka,
  a wszystko inne dostaje ogólny komunikat. Błąd trafia też do konsoli, żeby dało się go zgłosić.
- **Gdy nie ma JavaScriptu**, `index.html` pokazuje krótką informację w `<noscript>`.

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

Dane użytkownika (domownicy, własne przepisy, ulubione, plan posiłków i pomiary)
trafiają do IndexedDB, bo `localStorage` ma mały limit i nie nadaje się do danych strukturalnych.
IndexedDB opakowuje [Dexie](https://dexie.org). Daje typowane tabele, transakcje, wersjonowanie
schematu oraz `useLiveQuery`, dzięki któremu ekrany odświeżają się same po zmianie danych.

Zasady:

- Baza (`src/data/db.ts`) i repozytoria (np. `memberRepository.ts`) są jedynym miejscem, które
  zna Dexie. Reszta aplikacji woła funkcje repozytorium albo hooki z `src/hooks`
  (`useMembers`, `useRecipeEntries`, `usePlanEntries`).
- Operacje obejmujące kilka tabel są jedną transakcją. Usunięcie domownika zdejmuje go z planu,
  a usunięcie własnego przepisu usuwa go z ulubionych i z planu, więc nie zostają wpisy
  wskazujące na nieistniejące rzeczy.
- Rekord w bazie może mieć pola techniczne (np. `createdAt`), których nie ma w modelu domenowym.
  Repozytorium kopiuje pola jawnie, żeby takie dane nie wyciekały do aplikacji.
- Schemat zmieniamy wyłącznie przez dodanie nowego `version(n)` z funkcją migracji, nigdy przez
  edycję istniejącej wersji, bo dane użytkowników już leżą na ich urządzeniach.
- Identyfikatory to `crypto.randomUUID()`. Są stabilne, więc przydadzą się przy eksporcie
  i imporcie kopii zapasowej.
- Po pierwszym zapisie prosimy przeglądarkę o trwały magazyn (`navigator.storage.persist()`),
  żeby nie kasowała danych przy braku miejsca. Przeglądarka może odmówić i to nie jest błąd.
- Testy używają `fake-indexeddb`, instalowanego globalnie w `src/test/setup.ts`. Test migracji
  (`migration.test.ts`) tworzy bazę w starej wersji schematu i sprawdza, że dane przetrwają
  przejście na obecną.

Wersje schematu:

| Wersja | Zmiana                                                                            |
| ------ | --------------------------------------------------------------------------------- |
| 1      | Tabela `members` (domownicy)                                                      |
| 2      | Tabele `customRecipes` (własne przepisy) i `favorites` (ulubione)                 |
| 3      | Tabela `planEntries` (plan posiłków), z indeksem po dacie                         |
| 4      | Tabela `shoppingChecks` (odhaczone zakupy), z indeksem po tygodniu                |
| 5      | Tabela `snackOverrides` (przekąski na pojedyncze dni) i indeks `batchId` w planie |
| 6      | Tabela `measurements` (pomiary wagi i obwodów), z indeksem po domowniku           |

Członek zapisany przed wersją 5 nie ma pola `snackKcal`. Repozytorium traktuje brak jako 0, więc
nie potrzeba migracji danych, a test migracji sprawdza to na bazie w wersji 1. Podobnie brak
`targetWeightKg` (dodane w wersji 6 jako pole opcjonalne) oznacza, że domownik nie ma celu wagi.

Model domenowy:

| Encja         | Opis                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `Member`      | Domownik: imię, płeć, wiek, wzrost, waga, aktywność, cel, docelowa waga     |
| `Ingredient`  | Składnik z wartościami odżywczymi na 100 g i grupą żywności                 |
| `Recipe`      | Przepis: nazwa, posiłek, porcje, czas, składniki w gramach, kroki           |
| `PlanEntry`   | Wpis w kalendarzu: data, rodzaj posiłku, przepis, kto je posiłek            |
| `Measurement` | Pomiar wagi lub obwodu jednej osoby w danym dniu (najwyżej jeden na rodzaj) |

## Przepisy i składniki

Wbudowane składniki i przepisy to zwykłe moduły TypeScript w `src/content`. Dzięki temu są
sprawdzane przez kompilator i testy, nie wymagają bazy ani zapytań sieciowych i działają offline.
Do bazy trafiają tylko rzeczy tworzone przez użytkownika.

- Przepis przechowuje listę par (id składnika, gramy). Kalorie i makroskładniki nigdy nie są
  zapisywane, tylko liczone z katalogu (`recipeNutrition`). Poprawka wartości składnika
  poprawia więc wszystkie przepisy naraz.
- Diety (wegetariańska, wegańska, peskatariańska) są wyliczane z grup żywności składników
  (`compatibleDiets`), a nie wpisywane ręcznie, więc nie mogą się rozjechać z listą składników.
- Własne przepisy korzystają z tego samego katalogu składników. Ich identyfikatory to UUID,
  a wbudowanych to czytelne nazwy, więc kolizje są wykluczone.
- Ekran przepisów łączy oba źródła w hooku `useRecipeEntries`: własne przepisy wchodzą na początek
  listy, a ulubione to osobna tabela z samymi identyfikatorami, która obejmuje oba rodzaje.
- Filtrowanie i wyszukiwanie to czysta funkcja `filterRecipes`. Wyszukiwanie ignoruje wielkość
  liter i polskie znaki, więc „losos” znajduje „łosoś”.
- „Co ugotować z tego, co mam” to filtr po składnikach (`ingredientIds` w `RecipeFilter`):
  przepis musi zawierać wszystkie wybrane składniki, a łączy się go z pozostałymi filtrami. Wybór
  składnika to wspólny komponent `IngredientOptions`, używany też w formularzu przepisu.
- Formularz przepisu waliduje na żywo po pierwszej próbie zapisu, więc poprawione pole od razu
  przestaje zgłaszać błąd.

Skąd pochodzą dane i jak je dodawać, opisuje [DATA.md](DATA.md).

## Plan posiłków i porcje

- Plan to lista wpisów `PlanEntry`: dzień, rodzaj posiłku, przepis i lista osób, które jedzą.
  W jednym dniu jest najwyżej jeden wpis na rodzaj posiłku, więc kluczem w bazie jest
  `data_posiłek`. Wymiana dania to nadpisanie wpisu z zachowaniem osób (`assignRecipe`).
- Dni to ciągi `RRRR-MM-DD` (`DateKey`) w czasie lokalnym użytkownika, a nie obiekty `Date`.
  Dzięki temu strefy czasowe i zmiana czasu nie wpływają na zapisane dane. Działania na dniach
  (`src/domain/plan/dates.ts`) liczą w dniach kalendarzowych i mają testy na dzień zmiany czasu.
  Tydzień trwa od poniedziałku do niedzieli.
- Porcje liczy czysta funkcja z `src/domain/plan/portions.ts`. Każdy posiłek ma udział w dziennym
  zapotrzebowaniu osoby (`MEAL_SHARES`). Porcja to liczba porcji przepisu, która najlepiej trafia
  w cel kaloryczny posiłku. Zasady opisuje [NUTRITION.md](NUTRITION.md).
- Kalendarz pokazuje dla każdej osoby jej porcję i kalorie, łączną ilość do ugotowania, składniki
  dla wszystkich razem oraz podsumowanie dnia w porównaniu z dziennym celem.
- Gdyby wpis w planie wskazywał na nieistniejący przepis, ekran pokazuje komunikat i pozwala
  wybrać inne danie albo usunąć wpis, zamiast się zawiesić.

### Przekąski

- Domownik ma domyślną ilość kalorii na przekąski (`snackKcal`). Na pojedynczy dzień można ją
  zmienić (tabela `snackOverrides`). Funkcja `snackAllowance` zwraca ilość dla konkretnego dnia
  i osoby, a `planMeal` odejmuje ją od dziennego celu przed podziałem na posiłki.
- Przekąski nie mogą zająć więcej niż połowy dnia (`MAX_SNACK_SHARE`), bo posiłki przestałyby
  być posiłkami. Nadmiar jest ignorowany.
- Ilość równa domyślnej nie jest zapisywana jako osobny wpis, a „Przywróć domyślne” usuwa wpis.

### Gotowanie na zapas

- Danie ugotowane raz na kilka dni to kilka wpisów `PlanEntry` w kolejnych dniach tego samego
  posiłku. Pierwszy (dzień gotowania) ma `batchId`, a następne (resztki) mają ten sam `batchId`
  oraz `cookedOn`, czyli datę ugotowania. Każdy dzień ma własną listę osób i własne porcje.
- Zmianę długości liczy czysta funkcja `resizeBatch`, a repozytorium (`setBatchDays`) tylko zapisuje
  wynik w jednej transakcji: najpierw usuwa, potem zapisuje.
- Wydłużenie dodaje resztki i przesuwa później dania zaplanowane na te dni. Przesuwa tylko te,
  które przeszkadzają, jedno po drugim, i zatrzymuje się na pierwszym, które nie koliduje.
  Przesunięty batch zostaje w całości, a jego resztki wskazują nowy dzień gotowania.
- Skrócenie usuwa resztki i przesuwa wcześniej dania, które następowały bezpośrednio po batchu
  (bez przerwy), bo właśnie one zostały wcześniej przesunięte. Dzięki temu skrócenie do jednego dnia
  przywraca plan sprzed wydłużenia, co sprawdza test.
- Wymiana dania i usunięcie dotyczą całego batcha. Samych resztek nie da się wymienić ani usunąć,
  trzeba to zrobić w dniu gotowania. Można za to zmieniać, kto je resztki danego dnia.
- Kalendarz pokazuje przy daniu „Do ugotowania” dla wszystkich dni razem (`summarizeBatch`),
  a w dniach z resztkami informuje, że nic się nie gotuje.
- Zakupy: składniki całego batcha kupuje się w tygodniu, w którym danie jest gotowane, także gdy
  resztki wypadają w następnym (`entriesToBuyFor`). W tygodniu resztek tego samego dania nie
  kupuje się drugi raz.

## Lista zakupów

- Lista nie jest zapisywana. Za każdym razem powstaje od nowa z planu tygodnia, więc zawsze
  zgadza się z kalendarzem. `planMeals` liczy porcje wszystkich zaplanowanych posiłków, a
  `buildShoppingList` sumuje ich składniki.
- Sumowanie i zaokrąglanie: ilości dodajemy dokładnie i dopiero potem zaokrąglamy do 5 g
  (`roundGrams`), żeby błędy zaokrągleń nie nakładały się z posiłku na posiłek.
- Działy to grupy żywności składników (`INGREDIENT_CATEGORIES`) w kolejności przechodzenia przez
  sklep, a produkty w dziale są posortowane alfabetycznie po polsku.
- Przepisy ważą wszystko w gramach, a lista zakupów mówi to, co kupuje się w sklepie. Składnik może
  mieć `purchase` (waga jednej sztuki, puszki, opakowania) albo `gramsPerMl` (płyn). Czysta funkcja
  `buyingAmount` zamienia sumę gramów na `BuyingAmount`: całe sztuki zaokrąglone w górę, mililitry
  albo gramy. Dopiero `formatBuyingAmount` w `src/format` składa z tego polski tekst, razem z
  odmianą rzeczownika (`pluralPl`: 1 puszka, 3 puszki, 5 puszek). Liczymy sztuki z sumy całego
  tygodnia, a nie z każdego posiłku osobno, żeby nie kupować po jednym jajku za dużo. Przepisy, kalendarz
  i dane użytkownika zostają w gramach, więc nic w bazie ani w kopii zapasowej się nie zmieniło.
- Zapisujemy tylko to, co użytkownik odhaczył: tabela `shoppingChecks` z kluczem
  `poniedziałek_składnik`. Odhaczenia są osobne dla każdego tygodnia i przetrwają zmianę planu.
- Udostępnianie zależy od przeglądarki: arkusz udostępniania (`navigator.share`) tylko tam,
  gdzie istnieje, kopiowanie do schowka oraz link `wa.me`. Tekst zawiera wyłącznie to, co zostało do
  kupienia. Aplikacja nic nie wysyła sama, dane opuszczają urządzenie dopiero po kliknięciu.

## Wykluczenia domowników

Domownik może czegoś unikać (`Member.restrictions`): diety (wegetariańska, wegańska,
peskatariańska), alergenów i pojedynczych składników. To pomoc w planowaniu, a nie gwarancja, i tak
jest to powiedziane w formularzu.

- **Model.** `Restrictions` ma `diet`, `allergens` i `avoidedIngredientIds`. Pole jest opcjonalne i
  brakuje go u kogoś, kto je wszystko (`hasRestrictions`), więc istniejące dane nie wymagają migracji
  bazy: nie ma nowego indeksu ani tabeli. Alergeny są danymi składników (`Ingredient.allergens`)
  z jednej tabeli w `src/content/ingredients.ts`, a testy pilnują, żeby zgadzały się z grupą żywności.
- **Logika.** Czysta funkcja `recipeConflicts` mówi, co w przepisie koliduje z wykluczeniami jednej
  osoby: dieta (z `compatibleDiets`), alergen razem ze składnikami, które go niosą, albo pojedynczy
  składnik. Składnik jest zgłaszany raz: jako część alergenu, gdy ten alergen jest unikany, inaczej
  jako składnik. `conflictsForMembers` robi to dla wielu osób. Polski tekst („mleko i nabiał (masło,
  ser żółty)”) składa `describeConflicts` w `src/content`.
- **Gdzie widać.** Karta domownika wypisuje wykluczenia. Kalendarz ostrzega przy posiłku, w którym
  jest coś, czego unika ktoś z jedzących (ostrzeżenie znika, gdy tę osobę się wykreśli z „Kto je”).
  Wybór dania domyślnie ukrywa dania, których ktoś z jedzących unika, mówi, ile ukrył, i pozwala je
  pokazać z ostrzeżeniem. Pusty posiłek liczy wszystkich domowników, a już zaplanowany tylko tych,
  którzy go jedzą.
- **Zapis zmian domownika.** `updateMember` zapisuje cały rekord (`put`), a nie tylko podane pola.
  Wcześniej `update` zostawiał pole, które użytkownik wyczyścił (np. docelową wagę), więc wykluczenia,
  które da się usunąć, wymusiły naprawę.
- **Kopia zapasowa** w wersji 3 zawiera `restrictions`. Starszy plik wczytuje się bez nich, a składniki,
  których katalog już nie ma, są pomijane i policzone ([BACKUP.md](BACKUP.md)).

## Pomiary i postępy

- Pomiar (`Measurement`) to jedna wartość jednego rodzaju (`weight`, `waist`, `hips`, `chest`)
  jednej osoby w jednym dniu. Kluczem w bazie jest `domownik_rodzaj_dzień` (`measurementKey`),
  więc kolejny pomiar z tego samego dnia zastępuje poprzedni. `validateMeasurement` pilnuje zakresu
  (każdy rodzaj ma własny) i tego, że pomiar nie jest z przyszłości.
- Waga domownika to jego ostatnie ważenie. `saveMeasurement` i `removeMeasurement` w tej samej
  transakcji ustawiają `Member.weightKg` na wartość z najnowszego ważenia, niezależnie od kolejności
  wpisywania, bo od niej liczy się dzienne zapotrzebowanie. Gdy nie zostanie żadne ważenie, waga
  pozostaje taka, jaka była. Usunięcie domownika usuwa też jego pomiary.
- Docelowa waga (`targetWeightKg`) jest opcjonalna i ma sens tylko przy celu „schudnąć” albo
  „przytyć”. Formularz wymaga, żeby leżała po właściwej stronie obecnej wagi. Ważenia zmieniają
  jednak wagę, więc osoba, która osiągnęła cel, nadal go ma. Dlatego kopia zapasowa sprawdza tylko,
  czy to możliwa waga, a nie po której stronie leży.
- Logika postępów to czyste funkcje z `src/domain/progress`: `summarizeSeries` (pierwszy i ostatni
  pomiar oraz zmiana), `targetProgress` (ile już zrobiono i ile zostało, a kierunek wynika z
  punktu startu, więc ruch w złą stronę to brak postępu, a nie postęp ujemny) i `forecastTarget`.
- Prognoza opiera się na prostej dopasowanej metodą najmniejszych kwadratów do pomiarów z ostatnich
  ośmiu tygodni, więc jeden nietypowy dzień nie zmienia wyniku, a stare pomiary nie zaniżają tempa.
  Potrzeba co najmniej dwóch pomiarów w odstępie tygodnia. Daty nie podajemy, gdy trend stoi w
  miejscu (poniżej 0,05 kg na tydzień), oddala się od celu albo cel byłby dalej niż za dwa lata.
  Wynik to jeden z pięciu statusów (`reached`, `projected`, `too-far`, `not-approaching`,
  `not-enough-data`), a zdanie z niego składa `forecastText`. To przedłużenie dotychczasowego
  tempa, a nie obietnica, i tak jest sformułowane.
- Wykres (`ProgressChart`) to ręcznie narysowane SVG bez biblioteki wykresów: jedna linia, punkty
  i przerywana linia celu. Obliczenia osi (`valueAxis`, `timeFraction`) są w `chart.ts` i mają
  osobne testy. Oś pokazuje zawsze co najmniej dwie jednostki zakresu, żeby drobne wahania nie
  wyglądały jak skok. Wykres ma `role="img"` z opisem słownym, a wszystkie wartości są na liście
  pod nim, więc nic nie jest dostępne tylko wizualnie.

## Kopia zapasowa

Szczegóły pliku opisuje [BACKUP.md](BACKUP.md). Od strony architektury:

- Format pliku (`src/domain/backup`) jest niezależny od schematu bazy. Zapisujemy obiekty
  domenowe (domownik, przepis, wpis planu), a nie rekordy z kluczami i znacznikami czasu, więc
  zmiany w bazie nie zmieniają formatu. Format ma własny numer wersji (`BACKUP_VERSION`). Nowsza
  aplikacja czyta też starsze wersje pliku: kopia w wersji 1 nie ma pomiarów, więc wczytuje się
  z pustą listą.
- Plik z zewnątrz jest niezaufany, bo użytkownik mógł go edytować albo wybrać zły plik. Dlatego
  `parseBackup` sprawdza go ściśle tymi samymi regułami co formularze (`validateMember`,
  `validateRecipe`, `allowedGoals`), a pierwszy uszkodzony element odrzuca cały plik i podaje, gdzie
  jest problem. Odwołania do rzeczy, których aplikacja już nie zna (np. usunięty wbudowany przepis),
  są pomijane i policzone, bo to zwykły skutek aktualizacji aplikacji, a nie uszkodzenie pliku.
- Import (`importBackup`) czyści wszystkie tabele i wczytuje dane w jednej transakcji, więc przy
  błędzie nic się nie zmienia. Test sprawdza to na pliku, który baza odrzuca w połowie.
- Wersja aplikacji na ekranie ustawień pochodzi z `package.json` przez `define` w
  `vite.config.ts` (deklaracja `__APP_VERSION__` w `src/env.d.ts`), więc nie rozjedzie się z wydaniem.

## Testy

- **Logika domenowa:** testy jednostkowe obok kodu (`*.test.ts`). Obliczenia mają testy
  z ręcznie wyliczonymi wartościami oczekiwanymi.
- **Interfejs:** testy `*.test.tsx` oparte na Testing Library. Sprawdzają to, co widzi
  użytkownik (role, nazwy, widoczność), a nie szczegóły implementacji.
- **Dostępność:** `src/app/accessibility.test.tsx` renderuje każdy ekran (z danymi i bez) i puszcza
  na nim reguły axe-core (`src/test/axe.ts`). Kontrast liczy `src/styles/contrast.test.ts` na zmiennych
  projektowych, bo jsdom nie ma układu strony. Czego te testy nie obejmują, mówi
  [ACCESSIBILITY.md](ACCESSIBILITY.md).
- Vitest działa bez globalnych funkcji (`describe`, `it` importujemy jawnie).
- Testy odwołujące się do plików (jak `contrast.test.ts`) czytają je z dysku względem katalogu
  projektu, bo Vitest nie ładuje arkuszy stylów.

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
