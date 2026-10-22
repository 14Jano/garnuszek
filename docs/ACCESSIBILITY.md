# Dostępność

Garnuszek ma być użyteczny dla każdego: z klawiaturą zamiast myszy, z czytnikiem ekranu, z powiększonym
tekstem i przy słabym wzroku. Punktem odniesienia są wytyczne [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
na poziomie AA. To cel, a nie certyfikat: nikt zewnętrzny nie przeprowadził audytu.

## Co jest zrobione

**Struktura.** Każdy ekran ma jeden nagłówek `h1`, a strona ma obszary `header`, `main` i `nav` z
etykietą. Na początku jest odnośnik „Przejdź do treści”. Pola formularzy mają etykiety, a błędy i
podpowiedzi są z nimi powiązane (`aria-describedby`, `aria-invalid`).

**Tytuł strony i fokus.** Aplikacja jest jednostronicowa, więc przeglądarka sama nie zgłasza zmiany
ekranu. Dlatego (`src/app/usePageHeading.ts`):

- tytuł karty to treść nagłówka `h1` ekranu, np. „Pomiary: Anna – Garnuszek”, i zmienia się razem z nim,
- po przejściu na inny ekran fokus trafia do jego nagłówka, więc czytnik ekranu mówi, gdzie jesteśmy, a
  użytkownik klawiatury zaczyna od góry nowego ekranu zamiast od odnośnika, którego już nie ma,
- fokus zostaje na miejscu, gdy zmienia się tylko dzień albo tydzień.

**Fokus wewnątrz ekranu.** Tam, gdzie przyciski są podmieniane na inne, fokus nie spada na początek
strony:

- potwierdzenia usuwania (domownik, przepis, pomiar, wszystkie dane): fokus idzie na „Anuluj”, czyli
  bezpieczny wybór, a po anulowaniu wraca na przycisk, od którego zaczęto (`useConfirmFocus`),
- lista domowników i formularz zastępują się nawzajem, a fokus idzie za nagłówkiem
  (`useFocusWhenChanged`); po usunięciu domownika fokus wraca na nagłówek listy,
- podgląd kopii zapasowej po wybraniu pliku dostaje fokus, żeby nie został niezauważony.

**Komunikaty.** Błędy zapisu mają `role="alert"`, a potwierdzenia (zapisano pomiar, wczytano kopię) i
liczniki `role="status"`.

**Wykres.** To obraz (`role="img"`) z opisem słownym: pierwszy i ostatni pomiar oraz cel. Wszystkie
wartości są też na liście pod wykresem, więc nic nie jest dostępne tylko wizualnie.

**Kolory.** Wszystkie kolory to zmienne projektowe w `src/styles/index.css`, w jasnym i ciemnym
motywie. Tekst ma kontrast co najmniej 4,5:1, a obramowania pól i linie wykresu 3:1.

**Tekst i układ.** Rozmiary są w `rem`, więc aplikacja słucha ustawień rozmiaru tekstu. Sprawdzone
przy szerokości 320 px i tekście powiększonym do 200%: nic nie wychodzi poza ekran. Przy bardzo dużym
tekście dolny pasek nawigacji i pasek dni tygodnia w kalendarzu przewijają się poziomo zamiast
ucinać etykiety. Przyciski mają zwykle 44 px wysokości, a małe (np. „Usuń” na liście) 36 px.

**Ruch.** Przy ustawieniu systemu „ogranicz animacje” animacje są wyłączone.

**Awarie.** Gdy ekran się wywróci (także gdy przeglądarka nie pozwala zapisywać danych, np. w trybie
prywatnym), użytkownik widzi wyjaśnienie i może przejść na inny ekran zamiast patrzeć w pustą stronę.
Szczegóły w [ARCHITECTURE.md](ARCHITECTURE.md).

## Jak to sprawdzamy

| Co                                                                                         | Gdzie                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Reguły [axe-core](https://github.com/dequelabs/axe-core) na każdym ekranie, z danymi i bez | `src/app/accessibility.test.tsx`                                    |
| Tytuły ekranów i przenoszenie fokusu                                                       | `src/app/accessibility.test.tsx`, `src/app/usePageHeading.test.tsx` |
| Fokus w potwierdzeniach i formularzach                                                     | `src/app/accessibility.test.tsx`                                    |
| Kontrast kolorów (obie wersje kolorystyczne)                                               | `src/styles/contrast.test.ts`                                       |

Testy uruchamiają się razem z resztą (`npm test`) i w CI.

## Czego to nie obejmuje

Uczciwie, żeby nie sprawiać wrażenia, że wszystko jest sprawdzone:

- **Czytniki ekranu.** Struktura jest poprawna według axe, ale nikt nie przeszedł aplikacji z NVDA,
  VoiceOverem ani TalkBackiem. Jeśli korzystasz z czytnika i coś brzmi źle, zgłoś to.
- **Kontrast na gotowych ekranach.** jsdom nie liczy układu ani stylów, więc axe nie mierzy kontrastu.
  Sprawdzamy więc pary kolorów ze zmiennych projektowych, a nie piksele. W CSS komponentów nie ma
  kolorów wpisanych na stałe, więc to wystarcza, dopóki tak zostanie.
- **Układ w przeglądarce.** Powiększanie tekstu i szerokość 320 px sprawdzono ręcznie w jednej
  przeglądarce (Chromium), a nie w testach automatycznych.
- **Pole daty.** Wygląd i obsługa zależą od przeglądarki i systemu.
- **Drukowanie.** Listę zakupów można wydrukować, ale układ do druku nie jest przygotowany.

## Dodajesz nowy ekran lub komponent?

1. Jeden `h1`, który mówi, co to za ekran. To on staje się tytułem karty.
2. Każde pole ma `label`. Błąd i podpowiedź powiąż z polem (`aria-describedby`).
3. Przyciski, które się podmieniają (potwierdzenia, formularz w miejsce listy), niech przenoszą fokus
   (`useConfirmFocus`, `useFocusWhenChanged`).
4. Kolory tylko ze zmiennych z `src/styles/index.css`. Nową parę kolorów (tekst na tle) dopisz do
   `src/styles/contrast.test.ts`.
5. Układ nie może wychodzić poza ekran przy 320 px i tekście 200%: używaj `flex-wrap`,
   `minmax(0, 1fr)` i `min-width: 0`, a nie stałych szerokości.
6. Dodaj ekran do `src/app/accessibility.test.tsx`.
