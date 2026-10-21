import { PagePlaceholder } from '../../components/PagePlaceholder';

export function SettingsPage() {
  return (
    <PagePlaceholder
      title="Ustawienia"
      lead="Opcje aplikacji i kopia zapasowa Twoich danych."
      planned={[
        'Eksport i import danych do pliku',
        'Usunięcie wszystkich danych z urządzenia',
        'Informacje o aplikacji i licencji',
      ]}
      note="Garnuszek nie ma kont ani serwera. Wszystko, co wpiszesz, zostaje na tym urządzeniu."
    />
  );
}
