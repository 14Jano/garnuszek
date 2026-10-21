import { Heart } from 'lucide-react';
import { setFavorite } from '../../data/favoriteRepository';
import './FavoriteButton.css';

interface FavoriteButtonProps {
  recipeId: string;
  recipeName: string;
  favorite: boolean;
}

export function FavoriteButton({ recipeId, recipeName, favorite }: FavoriteButtonProps) {
  function toggle() {
    setFavorite(recipeId, !favorite).catch((error: unknown) => {
      console.error('Could not update favorites', error);
    });
  }

  return (
    <button
      type="button"
      className="favorite-button"
      aria-pressed={favorite}
      aria-label={`Ulubione: ${recipeName}`}
      onClick={toggle}
    >
      <Heart aria-hidden="true" size={22} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  );
}
