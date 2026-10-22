# Kopia zapasowa

Garnuszek nie ma serwera, więc dane użytkownika leżą tylko w przeglądarce. Kopia zapasowa to plik
JSON z wszystkim, co użytkownik wpisał. Ten dokument opisuje jego format i zasady wczytywania.

## Jak z niej korzystać

W **Ustawieniach**:

- **Pobierz kopię zapasową** zapisuje plik `garnuszek-kopia-RRRR-MM-DD.json` na urządzeniu. Plik
  powstaje lokalnie i nigdzie nie jest wysyłany.
- **Wczytaj kopię zapasową** odczytuje plik, pokazuje, co w nim jest, i pyta o potwierdzenie.
  Wczytanie **zastępuje** wszystkie dane na urządzeniu. Nie łączy ich z obecnymi.
- **Usuń wszystkie dane** czyści urządzenie. Wbudowane przepisy i składniki zostają, bo są częścią
  aplikacji.

## Co zawiera plik

Tylko to, co wpisał użytkownik. Wbudowane przepisy i składniki są w aplikacji, więc plik odwołuje się
do nich przez identyfikatory.

```json
{
  "format": "garnuszek-backup",
  "version": 2,
  "exportedAt": "2026-10-21T12:00:00.000Z",
  "members": [
    {
      "id": "…",
      "name": "Anna",
      "sex": "female",
      "age": 30,
      "heightCm": 165,
      "weightKg": 61,
      "activity": "light",
      "goal": "lose",
      "snackKcal": 150,
      "targetWeightKg": 58
    }
  ],
  "customRecipes": [
    {
      "id": "…",
      "name": "Pierogi ruskie",
      "mealType": "lunch",
      "servings": 4,
      "prepMinutes": 90,
      "ingredients": [{ "ingredientId": "potato", "grams": 600 }],
      "steps": ["Ugotuj ziemniaki."]
    }
  ],
  "favoriteRecipeIds": ["szakszuka"],
  "planEntries": [
    { "date": "2026-10-21", "mealType": "lunch", "recipeId": "…", "memberIds": ["…"] }
  ],
  "shoppingChecks": [{ "weekStart": "2026-10-19", "ingredientId": "potato" }],
  "snackOverrides": [{ "date": "2026-10-21", "memberId": "…", "kcal": 400 }],
  "measurements": [
    { "memberId": "…", "kind": "weight", "date": "2026-10-14", "value": 61.5 },
    { "memberId": "…", "kind": "waist", "date": "2026-10-14", "value": 78.5 }
  ]
}
```

| Pole                | Znaczenie                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| `format`            | Zawsze `garnuszek-backup`. Po tym aplikacja poznaje swój plik.               |
| `version`           | Wersja układu pliku (nie bazy danych), obecnie `2`.                          |
| `exportedAt`        | Kiedy plik powstał (ISO 8601).                                               |
| `members`           | Domownicy, od najstarszego. Kolejność jest zachowana przy wczytaniu.         |
| `measurements`      | Pomiary: `kind` to `weight` (kg), `waist`, `hips` lub `chest` (cm).          |
| `customRecipes`     | Własne przepisy. Składniki wskazują na katalog wbudowany.                    |
| `favoriteRecipeIds` | Ulubione, wbudowane i własne.                                                |
| `planEntries`       | Plan posiłków. Dania na kilka dni mają `batchId` i `cookedOn` (resztki).     |
| `shoppingChecks`    | Odhaczone zakupy, osobno dla każdego tygodnia (`weekStart` to poniedziałek). |
| `snackOverrides`    | Ilość kalorii na przekąski zmieniona na pojedynczy dzień.                    |

Daty to `RRRR-MM-DD` w czasie lokalnym użytkownika.

`targetWeightKg` domownika jest opcjonalne i pojawia się tylko wtedy, gdy ktoś ma cel wagi.

### Wersje pliku

| Wersja | Co zawiera                                                                       |
| ------ | -------------------------------------------------------------------------------- |
| 1      | Domownicy, własne przepisy, ulubione, plan, odhaczone zakupy, przekąski.         |
| 2      | Dodatkowo pomiary (`measurements`) i docelowa waga domownika (`targetWeightKg`). |

Kopię w wersji 1 aplikacja nadal wczyta. Nie ma w niej pomiarów, więc po wczytaniu lista pomiarów
jest pusta. Pole `measurements` w pliku w wersji 1 jest ignorowane, bo wersja 1 go nie znała.

## Jak aplikacja czyta plik

Plik jest niezaufany, bo można go edytować albo wybrać przez pomyłkę zły plik. Dlatego czytanie
(`parseBackup`) przebiega tak:

1. **Czy to JSON i czy to nasz plik.** Sprawdza `format` i `version`. Plik z nowszą wersją niż
   obsługiwana jest odrzucany z prośbą o aktualizację aplikacji.
2. **Ścisła kontrola własnych danych.** Domownicy, przepisy i wpisy planu muszą spełniać te same
   reguły co formularze: poprawne zakresy liczb, znane wartości płci, aktywności, celu i rodzaju
   posiłku, istniejące składniki, dziecko tylko z celem „utrzymać wagę”, unikalne identyfikatory,
   prawdziwe daty. **Pierwszy uszkodzony element odrzuca cały plik**, a aplikacja podaje miejsce
   problemu, np. `members[1].age`. Własny przepis nie może mieć identyfikatora wbudowanego.
   Pomiar musi mieć znany rodzaj i wartość z zakresu tego rodzaju. Docelowa waga domownika musi być
   możliwą wagą, ale nie musi leżeć po „właściwej” stronie obecnej wagi, bo kto osiągnął cel,
   zachowuje go.
3. **Pomijanie odwołań do nieistniejących rzeczy.** Wpis planu z przepisem, którego aplikacja już nie
   zna, ulubione i odhaczone zakupy z nieznanym składnikiem oraz przekąski i pomiary nieznanej osoby
   są pomijane, a ekran przed wczytaniem pokazuje, ile. To zwykły skutek aktualizacji aplikacji
   albo ręcznej edycji pliku, a nie uszkodzenie. Z wpisu planu znikają też osoby, których nie ma
   w kopii.
4. **Normalizacja.** Powtórzony wpis tego samego posiłku w tym samym dniu zostaje jeden (ostatni),
   to samo dotyczy pomiaru tego samego rodzaju w tym samym dniu, a data odhaczonych zakupów jest
   przesuwana na poniedziałek tygodnia.

Wczytanie (`importBackup`) odbywa się w jednej transakcji: najpierw usuwa obecne dane, potem zapisuje
nowe. Jeśli cokolwiek się nie powiedzie, stan urządzenia pozostaje bez zmian.

## Zmiany formatu

- Dodanie opcjonalnego pola, które starsza wersja może zignorować, nie wymaga zmiany `version`.
- Zmiana, której starsza wersja aplikacji nie zrozumie, wymaga podniesienia `BACKUP_VERSION`.
  Nowsza aplikacja powinna nadal czytać stare wersje pliku, więc dla każdej wersji zostaje
  wczytywanie.
- Nowe dane użytkownika (tabela, pole) trzeba dopisać do eksportu, importu i walidacji oraz do
  tego dokumentu.
