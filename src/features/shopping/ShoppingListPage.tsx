import { PagePlaceholder } from '../../components/PagePlaceholder';

export function ShoppingListPage() {
  return (
    <PagePlaceholder
      title="Lista zakupów"
      lead="Kupujesz tyle, ile zjecie. Lista powstaje z dań, które masz w kalendarzu."
      planned={[
        'Składniki zsumowane ze wszystkich zaplanowanych dań',
        'Podział na działy sklepowe',
        'Odhaczanie produktów w sklepie',
        'Udostępnianie listy domownikom',
      ]}
    />
  );
}
