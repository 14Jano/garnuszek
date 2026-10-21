import { PagePlaceholder } from '../../components/PagePlaceholder';

export function HouseholdPage() {
  return (
    <PagePlaceholder
      title="Domownicy"
      lead="Wpisujesz domowników raz, a Garnuszek liczy, ile kto powinien zjeść."
      planned={[
        'Wiek, wzrost, waga i cel każdej osoby',
        'Dzienne zapotrzebowanie kaloryczne',
        'Budżet kalorii na przekąski i słodycze',
      ]}
      note="Wyliczenia są orientacyjne i dotyczą zdrowych osób. Garnuszek nie zastępuje porady lekarza ani dietetyka i nie jest przeznaczony dla kobiet w ciąży ani karmiących piersią."
    />
  );
}
