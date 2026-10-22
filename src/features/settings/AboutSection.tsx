import { HealthDisclaimer } from '../../components/HealthDisclaimer';
import { REPOSITORY_URL } from '../../content/project';

export function AboutSection() {
  return (
    <section aria-labelledby="about-title">
      <h2 id="about-title">O aplikacji</h2>
      <p>
        Garnuszek {__APP_VERSION__}. Darmowy planer posiłków na licencji MIT, bez kont i bez reklam.
        Kod źródłowy jest{' '}
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          na GitHubie
        </a>
        .
      </p>
      <HealthDisclaimer />
    </section>
  );
}
