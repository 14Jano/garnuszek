# Dane: składniki i przepisy

Ten dokument opisuje, skąd pochodzą wbudowane składniki i przepisy, jak je dodawać oraz czego
dane nie obejmują.

## Pochodzenie

**Przepisy** (`src/content/recipes.ts`) są autorskie, napisane specjalnie dla Garnuszka. Nie
pochodzą z innych aplikacji ani stron.

**Wartości odżywcze składników** (`src/content/ingredients.ts`) to orientacyjne wartości na
100 g, zaokrąglone i wpisane ręcznie. Odpowiadają typowym wpisom z bazy
[USDA FoodData Central](https://fdc.nal.usda.gov) (produkty surowe lub suche, konserwy po
odsączeniu). Nie są automatycznym importem i nie zostały sprawdzone pozycja po pozycji z bazą,
dlatego traktuj je jako szacunki. Rzeczywiste produkty różnią się marką, tłustością i sposobem
przygotowania.

Przed użyciem w celach medycznych (np. dieta w chorobie) wartości trzeba zweryfikować,
a plan skonsultować ze specjalistą. Zobacz też zastrzeżenie w [README](../README.md).

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

4. Uruchom `npm test`. Testy sprawdzą m.in., że kalorie zgadzają się z makroskładnikami
   (białko i węglowodany po 4 kcal/g, tłuszcz 9 kcal/g, z tolerancją 20% lub 10 kcal) i że wagi
   sztuk oraz gęstości płynów są wiarygodne.

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
