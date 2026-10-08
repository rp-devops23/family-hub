// Catalogue d'emojis proposés dans les sélecteurs (tags, féculents, ingrédients, rayons)

export const EMOJI_GROUPS = [
  {
    id: 'food',
    icon: '🍎',
    emojis: ['🥬', '🥕', '🍅', '🥔', '🧅', '🧄', '🥒', '🥦', '🌽', '🍆', '🫑', '🍄', '🥑', '🍎', '🍌', '🍇', '🍓', '🍋', '🍊', '🍑', '🍐', '🍉', '🫐', '🥝', '🍒', '🥥', '🍍', '🌶️']
  },
  {
    id: 'meals',
    icon: '🍝',
    emojis: ['🍝', '🍜', '🍲', '🥘', '🍛', '🍣', '🍱', '🥟', '🌮', '🌯', '🥙', '🍕', '🍔', '🌭', '🥪', '🥗', '🍳', '🥞', '🧇', '🥐', '🍞', '🥖', '🍚', '🍙', '🥡', '🫕']
  },
  {
    id: 'protein',
    icon: '🥩',
    emojis: ['🥩', '🍖', '🍗', '🥓', '🍤', '🐟', '🦐', '🦑', '🦞', '🦀', '🥚', '🧀', '🥛', '🧈', '🫘', '🥜', '🌰', '🍄']
  },
  {
    id: 'sweet',
    icon: '🍰',
    emojis: ['🍰', '🎂', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🍯', '🍨', '🍦', '🥧', '🥮']
  },
  {
    id: 'drinks',
    icon: '🥤',
    emojis: ['🥤', '☕', '🍵', '🧃', '🍷', '🍺', '🥂', '🍹', '🧉', '🥛', '💧', '🧊']
  },
  {
    id: 'home',
    icon: '🧴',
    emojis: ['🛒', '🥫', '🧂', '🫙', '🧴', '🧻', '🧽', '🧼', '🪥', '🐾', '👶', '🕯️', '🔋', '🌿', '🪴']
  },
  {
    id: 'misc',
    icon: '⭐',
    emojis: ['🏷️', '⚡', '👶', '🌱', '❤️', '⭐', '🔥', '❄️', '☀️', '🍂', '🌸', '🎉', '🏠', '⏱️', '💰', '👨‍👩‍👧', '🎯', '✨', '💪', '🌍', '🇫🇷', '🇮🇹', '🇯🇵', '🇲🇽']
  }
]

// Rayons proposés à la première utilisation (ordre = ordre dans le magasin)
export const DEFAULT_SHOPPING_CATEGORIES = [
  { name_fr: 'Fruits & légumes', name_en: 'Produce', icon: '🥬' },
  { name_fr: 'Boucherie & poissons', name_en: 'Meat & fish', icon: '🥩' },
  { name_fr: 'Crèmerie', name_en: 'Dairy', icon: '🧀' },
  { name_fr: 'Boulangerie', name_en: 'Bakery', icon: '🍞' },
  { name_fr: 'Épicerie', name_en: 'Pantry', icon: '🥫' },
  { name_fr: 'Épices & condiments', name_en: 'Spices & condiments', icon: '🧂' },
  { name_fr: 'Surgelés', name_en: 'Frozen', icon: '🧊' },
  { name_fr: 'Boissons', name_en: 'Drinks', icon: '🥤' },
  { name_fr: 'Maison & hygiène', name_en: 'Household', icon: '🧴' },
  { name_fr: 'Autres', name_en: 'Other', icon: '🛒' }
]
