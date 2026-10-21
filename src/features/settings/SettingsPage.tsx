import { AboutSection } from './AboutSection';
import { BackupSection } from './BackupSection';
import { DeleteDataSection } from './DeleteDataSection';

export function SettingsPage() {
  return (
    <section>
      <h1>Ustawienia</h1>
      <p className="lead">Kopia zapasowa Twoich danych i informacje o aplikacji.</p>

      <BackupSection />
      <DeleteDataSection />
      <AboutSection />
    </section>
  );
}
