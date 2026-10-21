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

## Ograniczenia

- Równanie powstało na podstawie badań dorosłych. Dla dzieci daje tylko przybliżenie, dlatego
  osobom poniżej 18. roku życia aplikacja dopuszcza wyłącznie cel „utrzymać wagę”.
- Wzory nie uwzględniają ciąży, karmienia piersią, chorób przewlekłych ani leków.
- Dokładność rzędu ±10% jest normalna. Traktuj wynik jako punkt wyjścia i obserwuj, jak reaguje
  organizm.
