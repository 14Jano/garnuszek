# Dane: składniki i przepisy

Ten dokument opisuje, skąd pochodzą wbudowane składniki i przepisy, jak je dodawać oraz czego
dane nie obejmują.

## Pochodzenie

**Przepisy** (`src/content/recipes.ts`) w większości są autorskie, napisane specjalnie dla
Garnuszka, i nie pochodzą z innych aplikacji ani stron. Sześć to adaptacje przepisów amerykańskiego
instytutu rządowego NHLBI, opisane w [następnej sekcji](#przepisy-zaadaptowane). Każdy z nich ma
w aplikacji podpis ze źródłem (pole `origin`).

**Wartości odżywcze składników** (`src/content/ingredients.ts`) to orientacyjne wartości na
100 g, zaokrąglone i wpisane ręcznie. Odpowiadają typowym wpisom z bazy
[USDA FoodData Central](https://fdc.nal.usda.gov) (produkty surowe lub suche, konserwy po
odsączeniu). Nie są automatycznym importem i nie zostały sprawdzone pozycja po pozycji z bazą,
dlatego traktuj je jako szacunki. Rzeczywiste produkty różnią się marką, tłustością i sposobem
przygotowania.

Przed użyciem w celach medycznych (np. dieta w chorobie) wartości trzeba zweryfikować,
a plan skonsultować ze specjalistą. Zobacz też zastrzeżenie w [README](../README.md).

## Przepisy zaadaptowane

Sześć przepisów jest przepisanych po polsku z przepisów **National Heart, Lung, and Blood
Institute (NHLBI)**, czyli agencji rządu USA, opublikowanych na
[MedlinePlus](https://medlineplus.gov/recipes/) (National Library of Medicine, NIH).

**Dlaczego wolno.** Sprawdzono (23 października 2026, na stronach źródeł) oficjalny tekst
[MedlinePlus o używaniu treści](https://medlineplus.gov/about/using/usingcontent/). Mówi, że prace
rządu federalnego nie podlegają prawu autorskiemu w USA, wymienia „healthy recipes” wśród treści
w domenie publicznej i prosi o podpis „Source: MedlinePlus, National Library of Medicine”. Ten podpis
jest pod każdym zaadaptowanym przepisem. Strony tych przepisów mają też oznaczenie „A Heart-Healthy
Recipe from the National Heart, Lung, and Blood Institute”. Zdjęć nie bierzemy: z MedlinePlus nie
korzystamy z żadnych obrazów, bo te bywają chronione.

| Przepis w Garnuszku                         | Oryginał (MedlinePlus)            |
| ------------------------------------------- | --------------------------------- |
| Placuszki owsiane z orzechami i owocami     | Oatmeal Pecan Waffles or Pancakes |
| Kurczak z ryżem w jednym garnku             | Chicken and Rice                  |
| Ryż z mielonym mięsem i warzywami z patelni | Quick Beef Casserole              |
| Wołowina smażona z ziemniakami i cebulą     | Stir-Fried Beef and Potatoes      |
| Zapiekany makaron z serem                   | Classic Macaroni and Cheese       |
| Makaron razowy z pomidorami i mozzarellą    | Pasta Caprese                     |

**Co zmieniono.** Przepisy przetłumaczono i opisano własnymi słowami, miary amerykańskie (szklanki,
uncje, funty) przeliczono na gramy, a składniki dopasowano do katalogu: pekany to orzechy włoskie,
jeżyny to maliny, mąka pełnoziarnista to zwykła mąka pszenna, kawałki kurczaka z kością to pierś,
polędwica to polędwica wołowa, a odtłuszczone mleko skondensowane to zwykłe mleko. Cukier, sól,
zioła i proszek do pieczenia zostają poza listą składników, jak w pozostałych przepisach. Pominięto
seler. W trzech
przepisach (mięso z ryżem, wołowina z ziemniakami, makaron z serem) zmieniono liczbę porcji na 4,
żeby jedna porcja była pełnym posiłkiem, a nie dodatkiem. Ser w makaronie jest pełnotłusty, bo
katalog nie ma sera o obniżonej zawartości tłuszczu, więc kalorie wychodzą wyższe niż w oryginale.
Kalorie i makroskładniki liczy Garnuszek z własnego katalogu, a nie z oryginału.

**Czego nie użyto i dlaczego.**

- **Przepisy FoodHero.org**, choć MedlinePlus je pokazuje. Są z uniwersytetu stanowego (stopka
  serwisu: „Copyright © Oregon State University”), a nie z agencji federalnej, więc nie ma pewności,
  że wolno je przepisywać.
- **Pozostałe 12 przepisów NHLBI z MedlinePlus.** To dodatki, desery i napoje albo wymagają
  składników spoza katalogu (kuskus, mąka kukurydziana do pupusas, fasola mung z krewetkami).
- **USDA (MyPlate, Team Nutrition).** Oficjalna strona [USDA](https://www.usda.gov/about-usda/policies-and-links)
  mówi, że większość jej treści jest w domenie publicznej, ale serwisy z przepisami (fns.usda.gov,
  myplate.gov) nie otwierały się z Polski, więc nie dało się przeczytać ich własnych warunków.
  Niczego stamtąd nie wzięto.
- **Przepisy z samego serwisu nhlbi.nih.gov.** Są to także prace federalne, ale nie znaleziono tam
  własnego oświadczenia o prawach, więc wybrano te z wyraźnym oświadczeniem MedlinePlus.

To ocena autorów projektu na podstawie tekstów źródeł, a nie porada prawna. Jeśli właściciel źródła
poprosi o zmianę albo usunięcie, trzeba je wykonać.

## Jak dodać składnik

1. Dopisz wiersz w `src/content/ingredients.ts` do właściwej grupy:

   ```ts
   food('id-skladnika', 'Nazwa po polsku', 'grains', kcal, bialko, tluszcz, weglowodany),
   ```

   Wartości podajemy na 100 g produktu w takiej postaci, w jakiej jest ważony w przepisie.
   Identyfikator zapisujemy małymi literami, słowami rozdzielonymi myślnikiem, po angielsku.

2. Wybierz grupę żywności (`category`). Od niej zależy, do jakich diet składnik pasuje i w którym dziale listy zakupów się pojawi:

   | Grupa           | Wykluczona z diet                             |
   | --------------- | --------------------------------------------- |
   | `meat`          | peskatariańskiej, wegetariańskiej, wegańskiej |
   | `fish`          | wegetariańskiej, wegańskiej                   |
   | `dairy`, `eggs` | wegańskiej                                    |
   | pozostałe grupy | żadnej                                        |

3. Zdecyduj, jak lista zakupów ma liczyć składnik. Domyślnie w gramach i kilogramach, ale gdy
   w sklepie kupuje się go inaczej, dodaj ostatni argument `food(...)`:

   | Zapis          | Lista zakupów pokaże | Przykład               |
   | -------------- | -------------------- | ---------------------- |
   | `piece(55)`    | `6 szt.`             | jajko, banan, papryka  |
   | `head(40)`     | `2 główki`           | czosnek, sałata        |
   | `can(240)`     | `2 puszki`           | ciecierzyca, pomidory  |
   | `pack(200)`    | `1 opakowanie`       | masło, twaróg, tofu    |
   | `loaf(500)`    | `2 bochenki`         | chleb                  |
   | `liquid(1.03)` | `1,5 l`, `250 ml`    | mleko, oliwa (g na ml) |

   Liczba w nawiasie to waga jednej sztuki, puszki czy opakowania **liczona tak, jak waży ją
   przepis** (puszka to waga po odsączeniu, bo tak ją podają przepisy). Lista zaokrągla w górę do
   całych sztuk, bo sklep nie sprzeda pół jajka. Przy puszkach, opakowaniach i bochenkach dopisuje
   „potrzeba ok. 400 g”, bo rozmiary w sklepach bywają różne. Podawaj typowe rozmiary z polskich
   sklepów. Czego nie jesteś pewien (jogurty, ryż, makaron), zostaw w gramach, bo to też jest
   czytelne.

4. Wpisz alergeny składnika w tabeli `ALLERGENS_BY_INGREDIENT` na końcu `src/content/ingredients.ts`
   (osobno od wiersza, żeby całą tabelę dało się przejrzeć naraz). To ważne: domownik, który unika
   mleka czy glutenu, polega na tej tabeli, więc **w razie wątpliwości dopisz alergen**. Katalog
   zna osiem alergenów, wzorowanych na liście z etykiet UE:

   | Alergen     | Co obejmuje                                                         |
   | ----------- | ------------------------------------------------------------------- |
   | `gluten`    | pszenica i inne zboża z glutenem, owies, makaron, chleb, sos sojowy |
   | `milk`      | wszystko z mleka (też masło, sery, jogurty), więc także laktoza     |
   | `eggs`      | jajka                                                               |
   | `fish`      | ryby                                                                |
   | `peanuts`   | orzeszki ziemne i masło orzechowe                                   |
   | `tree-nuts` | orzechy włoskie, migdały i inne orzechy                             |
   | `soy`       | soja: tofu, napój sojowy, sos sojowy                                |
   | `sesame`    | sezam: tahini i hummus (jest zrobiony z tahini)                     |

   Owies oznaczamy jako gluten, tak jak na etykietach, bo zwykle miele się go razem z pszenicą.
   Kasza gryczana, jaglana i ryż są bez glutenu.

5. Uruchom `npm test`. Testy sprawdzą m.in., że kalorie zgadzają się z makroskładnikami
   (białko i węglowodany po 4 kcal/g, tłuszcz 9 kcal/g, z tolerancją 20% lub 10 kcal), że wagi
   sztuk oraz gęstości płynów są wiarygodne i że alergeny zgadzają się z grupą żywności (każdy
   nabiał ma `milk`, każde jajko `eggs`, każda ryba `fish`, a pieczywo i makarony `gluten`).

## Jak dodać przepis

1. Dopisz wywołanie `recipe({...})` w `src/content/recipes.ts` do właściwej sekcji:

   ```ts
   recipe({
     id: 'nazwa-przepisu',
     name: 'Nazwa przepisu',
     mealType: 'lunch', // breakfast, lunch lub dinner
     servings: 2,
     prepMinutes: 30,
     ingredients: [
       ['potato', 500],
       ['quark', 200],
     ],
     steps: ['Pierwszy krok.', 'Drugi krok.'],
   }),
   ```

2. Ilości podajemy w gramach, łącznie na wszystkie porcje. Przyprawy do smaku (sól, pieprz, zioła)
   zostają w opisie kroków i nie są składnikami.
3. Uruchom `npm test`. Testy sprawdzą, że identyfikator jest unikalny, wszystkie składniki
   istnieją w katalogu, są co najmniej dwa kroki, a porcja ma od 150 do 900 kcal.

Rodzaj posiłku odpowiada polskim nazwom: `breakfast` to śniadanie, `lunch` to obiad
(główny posiłek dnia), a `dinner` to kolacja.

## Ograniczenia

- Wszystkie ilości są w gramach, także płyny (mleko, mleko kokosowe, sos sojowy). Dla większości
  produktów gram jest bliski mililitrowi, ale np. oliwa jest o około 8% lżejsza od wody.
- Katalog nie ma jeszcze możliwości dodawania własnych składników. Własne przepisy korzystają
  z tego samego katalogu co wbudowane. Dodawanie własnych składników jest w planach.
- Wartości odżywcze obejmują energię, białko, tłuszcz i węglowodany. Nie ma błonnika, cukrów,
  soli ani witamin.
- Diety są wyliczane z grup żywności. Aplikacja nie wykrywa alergenów ani np. glutenu.
- Przepisy nie mają zdjęć.
