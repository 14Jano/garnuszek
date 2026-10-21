import { PagePlaceholder } from '../../components/PagePlaceholder';

export function CalendarPage() {
  return (
    <PagePlaceholder
      title="Kalendarz posiłków"
      lead="Tutaj ułożysz śniadania, obiady i kolacje na cały tydzień, a nawet na miesiąc."
      planned={[
        'Plan na każdy dzień z osobną porcją dla każdego domownika',
        'Wymiana dania jednym kliknięciem',
        'Gotowanie na zapas: jedno danie na 2–4 dni',
        'Odznaczanie osób, które nie jedzą danego posiłku',
      ]}
    />
  );
}
