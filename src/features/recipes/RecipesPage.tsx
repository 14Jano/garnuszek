import { PagePlaceholder } from '../../components/PagePlaceholder';

export function RecipesPage() {
  return (
    <PagePlaceholder
      title="Przepisy"
      lead="Proste, domowe dania, które da się ugotować po pracy."
      planned={[
        'Baza przepisów z kaloriami i makroskładnikami',
        'Własne przepisy z automatycznym liczeniem kalorii',
        'Wyszukiwanie dań po składnikach, które masz w lodówce',
        'Ulubione dania',
      ]}
    />
  );
}
