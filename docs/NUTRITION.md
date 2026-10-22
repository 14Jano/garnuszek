# Obliczenia żywieniowe

Ten dokument opisuje wzory użyte w `src/domain/nutrition`. Wyniki są orientacyjne i dotyczą
zdrowych osób. Nie zastępują porady lekarza ani dietetyka.

## 1. Podstawowa przemiana materii (BMR)

Używamy równania Mifflina i St Jeora:

```text
BMR = 10 × masa [kg] + 6,25 × wzrost [cm] − 5 × wiek [lata] + s
s = +5 dla mężczyzn, −161 dla kobiet
```

Przykład: mężczyzna, 30 lat, 180 cm, 80 kg → `800 + 1125 − 150 + 5 = 1780 kcal`.

Źródło: Mifflin MD, St Jeor ST i in., _A new predictive equation for resting energy expenditure in
healthy individuals_, Am J Clin Nutr 1990;51(2):241–247.

## 2. Całkowite dzienne zapotrzebowanie (TDEE)

BMR mnożymy przez współczynnik aktywności:

| Aktywność   | Współczynnik |
| ----------- | ------------ |
| `sedentary` | 1,2          |
| `light`     | 1,375        |
| `moderate`  | 1,55         |
| `active`    | 1,725        |

To powszechnie stosowane mnożniki typu Harrisa–Benedicta. Są przybliżeniem, bo realna aktywność
bardzo różni się między ludźmi.

Opisy poziomów w formularzu: siedzący tryb życia (mało ruchu), lekka aktywność (1–3 treningi
w tygodniu), umiarkowana (3–5 treningów w tygodniu), duża (6–7 treningów lub praca fizyczna).

## 3. Korekta według celu

| Cel        | Korekta |
| ---------- | ------- |
| `lose`     | −15%    |
| `maintain` | 0%      |
| `gain`     | +10%    |

Wynik zaokrąglamy do pełnych kilokalorii.

## 4. Dolna granica przy odchudzaniu

Dla celu `lose` wynik nie spadnie poniżej **1200 kcal** (kobiety) i **1500 kcal** (mężczyźni).
Są to wartości często podawane w poradnikach jako minimum, którego nie należy przekraczać bez
nadzoru specjalisty. Granica chroni drobne osoby przed zbyt dużym deficytem.

Dla celu `maintain` granica **nie obowiązuje**, ponieważ dzieci potrzebują mniej kalorii niż
dorośli.

## 5. Cel dla dzieci i młodzieży

Osoby poniżej 18. roku życia nadal rosną, więc odchudzanie i przybieranie na wadze nie mają
w ich przypadku sensu. Aplikacja dopuszcza dla nich wyłącznie cel `maintain` (funkcja
`allowedGoals` w `src/domain/household/member.ts`). Pole celu w formularzu jest wtedy zablokowane.

## 6. Porcje w planie posiłków

Dzienne zapotrzebowanie dzielimy na posiłki (`MEAL_SHARES` w `src/domain/plan/portions.ts`):

| Posiłek   | Udział w dniu |
| --------- | ------------- |
| Śniadanie | 30%           |
| Obiad     | 40%           |
| Kolacja   | 30%           |

Cel kaloryczny posiłku to udział pomnożony przez dzienny cel osoby. Porcja osoby to liczba porcji
przepisu równa celowi posiłku podzielonemu przez kalorie jednej porcji przepisu, czyli:

```text
porcja = cel posiłku [kcal] / kcal jednej porcji przepisu
```

Wynik zaokrąglamy do 0,05 porcji, żeby ilości dało się ugotować, i ograniczamy do przedziału
od 0,25 do 3 porcji. Granice chronią przed absurdalnymi ilościami przy bardzo lekkim lub bardzo
sycącym daniu, ale przy skrajnych przepisach posiłek może wtedy nie trafić dokładnie w cel.
Ilości składników skalują się proporcjonalnie do porcji.

Przykład: Anna ma 1815 kcal dziennie, więc na obiad 726 kcal. Chili sin carne ma 363,5 kcal
w porcji, więc Anna je 726 / 363,5 = 1,997, czyli po zaokrągleniu 2 porcje (727 kcal).

### Przekąski

Każdy domownik ma budżet kalorii na przekąski i słodycze (od 0 do 1000 kcal dziennie), który można
zmienić na jeden konkretny dzień. Ta ilość jest odejmowana od dziennego celu **przed** podziałem
na posiłki, więc cel posiłku to udział posiłku pomnożony przez to, co zostało:

```text
cel posiłku = udział × (dzienny cel − przekąski)
```

Przekąski nie mogą zająć więcej niż połowy dziennego celu. Przy większej wartości nadmiar jest
ignorowany, żeby posiłki nadal były posiłkami. W podsumowaniu dnia przekąski są doliczone do
zjedzonych kalorii.

Przykład: Anna ma 1815 kcal dziennie i zostawia 300 kcal na przekąski. Na obiad ma więc
0,4 × 1515 = 606 kcal, czyli 1,65 porcji chili sin carne (600 kcal), a podsumowanie dnia pokaże
600 + 300 = 900 kcal.

### Gotowanie na zapas

Danie ugotowane raz na kilka dni jest zjadane w kolejnych dniach w porcjach liczonych osobno dla
każdego dnia i każdej osoby. Ilość do ugotowania i składniki to suma wszystkich dni.

## 7. Waga w czasie i prognoza

Dzienne zapotrzebowanie liczy się od aktualnej wagi (punkt 1), dlatego waga domownika jest zawsze
wagą z jego ostatniego ważenia. Po wpisaniu nowego ważenia zapotrzebowanie i porcje przeliczają się
od niego.

Prognoza osiągnięcia docelowej wagi nie jest wzorem żywieniowym, tylko przedłużeniem tempa, w jakim
waga zmienia się naprawdę:

1. Bierzemy ważenia z ostatnich 8 tygodni (licząc od najnowszego).
2. Dopasowujemy do nich prostą metodą najmniejszych kwadratów. Jej nachylenie to zmiana na dzień,
   a razy 7 zmiana na tydzień.
3. Dzielimy odległość od celu (liczoną od wartości na prostej, a nie od ostatniego pojedynczego
   ważenia) przez to tempo i dodajemy wynik do daty ostatniego ważenia.

Prognozy nie podajemy, gdy:

- ważenia obejmują mniej niż 7 dni,
- tempo jest mniejsze niż 0,05 kg na tydzień albo prowadzi od celu,
- cel byłby oddalony o więcej niż 2 lata.

Przykład: 14.10 waga 70 kg, 21.10 waga 69 kg, cel 62 kg. Tempo to −1 kg na tydzień, do celu zostało
7 kg, więc prognoza to 7 tygodni po 21.10, czyli 9 grudnia.

Pomiary obwodów (talia, biodra, klatka piersiowa) są tylko zapisywane i pokazywane na wykresie.
Nie wpływają na żadne obliczenia.

## Ograniczenia

- Prognoza zakłada, że tempo się nie zmieni, a tak zwykle nie bywa: waga waha się z dnia na dzień
  i zwalnia, gdy zbliża się do celu. Traktuj datę jako orientacyjną.
- Równanie powstało na podstawie badań dorosłych. Dla dzieci daje tylko przybliżenie, dlatego
  osobom poniżej 18. roku życia aplikacja dopuszcza wyłącznie cel „utrzymać wagę”.
- Wzory nie uwzględniają ciąży, karmienia piersią, chorób przewlekłych ani leków.
- Dokładność rzędu ±10% jest normalna. Traktuj wynik jako punkt wyjścia i obserwuj, jak reaguje
  organizm.
