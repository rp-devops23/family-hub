// ============================================
// TRANSLATIONS
// ============================================

const translations = {
    fr: {
      // Auth
      'auth.title': 'Mes Recettes',
      'auth.subtitle': 'Organisez vos recettes préférées',
      'auth.login': 'Connexion',
      'auth.signup': 'Inscription',
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.displayName': 'Votre prénom',
      'auth.loginButton': 'Se connecter',
      'auth.signupButton': "S'inscrire",
      'auth.switchToSignup': "Pas encore de compte ? S'inscrire",
      'auth.switchToLogin': 'Déjà un compte ? Se connecter',
      'auth.error.invalid': 'Email ou mot de passe incorrect',
      'auth.error.exists': 'Un compte existe déjà avec cet email',
      'auth.error.weak': 'Le mot de passe doit faire au moins 6 caractères',
      'auth.error.generic': 'Une erreur est survenue',

      // Navigation
      'nav.recipes': 'Recettes',
      'nav.calendar': 'Calendrier',
      'nav.settings': 'Paramètres',

      // Recipes
      'recipes.title': 'Mes recettes',
      'recipes.empty': 'Aucune recette pour le moment',
      'recipes.emptyFiltered': 'Aucune recette ne correspond aux filtres',
      'recipes.add': 'Nouvelle recette',
      'recipes.search': 'Rechercher...',
      'recipes.filters': 'Filtres',
      'recipes.clearFilters': 'Effacer',

      // Recipe form
      'recipe.new': 'Nouvelle recette',
      'recipe.edit': 'Modifier la recette',
      'recipe.name': 'Nom de la recette',
      'recipe.name.placeholder': 'Ex: Pâtes carbonara',
      'recipe.name.duplicate': 'Une recette avec ce nom existe déjà',
      'recipe.seasons': 'Saisons',
      'recipe.tags': 'Tags',
      'recipe.base': 'Féculent / Base',
      'recipe.base.none': 'Aucun',
      'recipe.cuisine': 'Cuisine',
      'recipe.cuisine.none': 'Non spécifié',
      'recipe.difficulty': 'Difficulté',
      'recipe.prepTime': 'Temps de préparation',
      'recipe.prepTime.placeholder': 'En minutes',
      'recipe.notes': 'Notes',
      'recipe.notes.placeholder': 'Instructions, astuces, etc.',
      'recipe.mealType': 'Type de plat',
      'recipe.priceRange': 'Budget',
      'recipe.save': 'Enregistrer',
      'recipe.cancel': 'Annuler',
      'recipe.delete': 'Supprimer',
      'recipe.deleteConfirm': 'Supprimer cette recette ?',

      // Ingredients
      'recipe.ingredients': 'Ingrédients',
      'recipe.ingredients.add': 'Ajouter un ingrédient',
      'recipe.ingredients.select': 'Rechercher un ingrédient...',
      'recipe.ingredients.new': 'Nouvel ingrédient',
      'recipe.ingredients.quantity': 'Qté',
      'recipe.ingredients.unit': 'Unité',
      'recipe.ingredients.empty': 'Aucun ingrédient trouvé',

      // Seasons
      'season.winter': 'Hiver',
      'season.spring': 'Printemps',
      'season.summer': 'Été',
      'season.autumn': 'Automne',

      // Difficulty
      'difficulty.easy': 'Facile',
      'difficulty.medium': 'Moyen',
      'difficulty.hard': 'Difficile',

      // Meal types
      'mealType.appetizer': 'Apéritif',
      'mealType.starter': 'Entrée',
      'mealType.main': 'Plat principal',
      'mealType.side': 'Accompagnement',
      'mealType.dessert': 'Dessert',

      // Price range
      'priceRange.cheap': 'Économique',
      'priceRange.medium': 'Moyen',
      'priceRange.expensive': 'Cher',

      // Calendar
      'calendar.title': 'Planning des repas',
      'calendar.today': "Aujourd'hui",
      'calendar.week': 'Semaine',
      'calendar.month': 'Mois',
      'calendar.addMeal': 'Ajouter un repas',
      'calendar.pickRecipe': 'Choisir une recette',
      'calendar.noRecipes': 'Aucune recette disponible',
      'calendar.removeMeal': 'Retirer',
      'calendar.deleteConfirm': 'Supprimer ce repas ?',

      // Settings
      'settings.title': 'Paramètres',
      'settings.tags': 'Gérer les tags',
      'settings.bases': 'Gérer les féculents',
      'settings.ingredients': 'Gérer les ingrédients',
      'settings.language': 'Langue',
      'settings.logout': 'Déconnexion',
      'settings.logoutConfirm': 'Voulez-vous vous déconnecter ?',

      // Tag/Base/Ingredient management
      'manage.tags.title': 'Mes tags',
      'manage.bases.title': 'Mes féculents',
      'manage.ingredients.title': 'Mes ingrédients',
      'manage.add': 'Ajouter',
      'manage.nameFr': 'Nom (français)',
      'manage.nameEn': 'Nom (anglais)',
      'manage.icon': 'Icône',
      'manage.save': 'Enregistrer',
      'manage.cancel': 'Annuler',
      'manage.delete': 'Supprimer',
      'manage.deleteConfirm': 'Supprimer cet élément ?',
      'manage.inUse': 'Utilisé dans {count} recette(s)',

      // Common
      'common.loading': 'Chargement...',
      'common.error': 'Erreur',
      'common.retry': 'Réessayer',
      'common.confirm': 'Confirmer',
      'common.add': 'Ajouter',
      'common.yes': 'Oui',
      'common.no': 'Non',
      'common.minutes': 'min',

      // Shopping list
      'nav.shopping': 'Courses',
      'shopping.title': 'Liste de courses',
      'shopping.subtitle': 'Gérez vos achats',
      'shopping.empty': 'Votre liste de courses est vide',
      'shopping.generate': 'Générer depuis le calendrier',
      'shopping.generateFromMeals': 'Générer depuis les repas planifiés',
      'shopping.addItem': 'Ajouter un article',
      'shopping.searchPlaceholder': 'Rechercher un ingrédient...',
      'shopping.customItemPlaceholder': 'Ajouter un article manuellement...',
      'shopping.items': 'À acheter',
      'shopping.inCart': 'Dans le panier',
      'shopping.quantity': 'Qté',
      'shopping.unit': 'Unité',
      'shopping.clearChecked': 'Supprimer les cochés',
      'shopping.clearCheckedConfirm': 'Supprimer les articles cochés ?',
      'shopping.clearAll': 'Vider la liste',
      'shopping.clearAllConfirm': 'Vider toute la liste de courses ?',
      'shopping.selectDays': 'Sélectionner les jours',
      'shopping.selectDaysDesc': 'Choisissez les jours pour générer la liste',
      'shopping.selectedMeals': 'repas sélectionné(s)',
      'shopping.generateList': 'Générer la liste',
      'shopping.itemsAdded': '{count} article(s) ajouté(s)',
      'shopping.customItem': 'Article personnalisé...',
    },

    en: {
      // Auth
      'auth.title': 'My Recipes',
      'auth.subtitle': 'Organize your favorite recipes',
      'auth.login': 'Login',
      'auth.signup': 'Sign up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.displayName': 'Your name',
      'auth.loginButton': 'Log in',
      'auth.signupButton': 'Sign up',
      'auth.switchToSignup': "Don't have an account? Sign up",
      'auth.switchToLogin': 'Already have an account? Log in',
      'auth.error.invalid': 'Invalid email or password',
      'auth.error.exists': 'An account already exists with this email',
      'auth.error.weak': 'Password must be at least 6 characters',
      'auth.error.generic': 'An error occurred',

      // Navigation
      'nav.recipes': 'Recipes',
      'nav.calendar': 'Calendar',
      'nav.settings': 'Settings',

      // Recipes
      'recipes.title': 'My recipes',
      'recipes.empty': 'No recipes yet',
      'recipes.emptyFiltered': 'No recipes match the filters',
      'recipes.add': 'New recipe',
      'recipes.search': 'Search...',
      'recipes.filters': 'Filters',
      'recipes.clearFilters': 'Clear',

      // Recipe form
      'recipe.new': 'New recipe',
      'recipe.edit': 'Edit recipe',
      'recipe.name': 'Recipe name',
      'recipe.name.placeholder': 'E.g. Spaghetti carbonara',
      'recipe.name.duplicate': 'A recipe with this name already exists',
      'recipe.seasons': 'Seasons',
      'recipe.tags': 'Tags',
      'recipe.base': 'Starch / Base',
      'recipe.base.none': 'None',
      'recipe.cuisine': 'Cuisine',
      'recipe.cuisine.none': 'Not specified',
      'recipe.difficulty': 'Difficulty',
      'recipe.prepTime': 'Prep time',
      'recipe.prepTime.placeholder': 'In minutes',
      'recipe.notes': 'Notes',
      'recipe.notes.placeholder': 'Instructions, tips, etc.',
      'recipe.mealType': 'Meal type',
      'recipe.priceRange': 'Budget',
      'recipe.save': 'Save',
      'recipe.cancel': 'Cancel',
      'recipe.delete': 'Delete',
      'recipe.deleteConfirm': 'Delete this recipe?',

      // Ingredients
      'recipe.ingredients': 'Ingredients',
      'recipe.ingredients.add': 'Add ingredient',
      'recipe.ingredients.select': 'Search ingredient...',
      'recipe.ingredients.new': 'New ingredient',
      'recipe.ingredients.quantity': 'Qty',
      'recipe.ingredients.unit': 'Unit',
      'recipe.ingredients.empty': 'No ingredient found',

      // Seasons
      'season.winter': 'Winter',
      'season.spring': 'Spring',
      'season.summer': 'Summer',
      'season.autumn': 'Autumn',

      // Difficulty
      'difficulty.easy': 'Easy',
      'difficulty.medium': 'Medium',
      'difficulty.hard': 'Hard',

      // Meal types
      'mealType.appetizer': 'Appetizer',
      'mealType.starter': 'Starter',
      'mealType.main': 'Main course',
      'mealType.side': 'Side dish',
      'mealType.dessert': 'Dessert',

      // Price range
      'priceRange.cheap': 'Budget',
      'priceRange.medium': 'Medium',
      'priceRange.expensive': 'Expensive',

      // Calendar
      'calendar.title': 'Meal planning',
      'calendar.today': 'Today',
      'calendar.week': 'Week',
      'calendar.month': 'Month',
      'calendar.addMeal': 'Add meal',
      'calendar.pickRecipe': 'Pick a recipe',
      'calendar.noRecipes': 'No recipes available',
      'calendar.removeMeal': 'Remove',
      'calendar.deleteConfirm': 'Delete this meal?',

      // Settings
      'settings.title': 'Settings',
      'settings.tags': 'Manage tags',
      'settings.bases': 'Manage starches',
      'settings.ingredients': 'Manage ingredients',
      'settings.language': 'Language',
      'settings.logout': 'Log out',
      'settings.logoutConfirm': 'Do you want to log out?',

      // Tag/Base/Ingredient management
      'manage.tags.title': 'My tags',
      'manage.bases.title': 'My starches',
      'manage.ingredients.title': 'My ingredients',
      'manage.add': 'Add',
      'manage.nameFr': 'Name (French)',
      'manage.nameEn': 'Name (English)',
      'manage.icon': 'Icon',
      'manage.save': 'Save',
      'manage.cancel': 'Cancel',
      'manage.delete': 'Delete',
      'manage.deleteConfirm': 'Delete this item?',
      'manage.inUse': 'Used in {count} recipe(s)',

      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.retry': 'Retry',
      'common.confirm': 'Confirm',
      'common.add': 'Add',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.minutes': 'min',

      // Shopping list
      'nav.shopping': 'Shopping',
      'shopping.title': 'Shopping list',
      'shopping.subtitle': 'Manage your groceries',
      'shopping.empty': 'Your shopping list is empty',
      'shopping.generate': 'Generate from calendar',
      'shopping.generateFromMeals': 'Generate from planned meals',
      'shopping.addItem': 'Add item',
      'shopping.searchPlaceholder': 'Search an ingredient...',
      'shopping.customItemPlaceholder': 'Add a custom item...',
      'shopping.items': 'To buy',
      'shopping.inCart': 'In cart',
      'shopping.quantity': 'Qty',
      'shopping.unit': 'Unit',
      'shopping.clearChecked': 'Remove checked',
      'shopping.clearCheckedConfirm': 'Remove checked items?',
      'shopping.clearAll': 'Clear list',
      'shopping.clearAllConfirm': 'Clear the entire shopping list?',
      'shopping.selectDays': 'Select days',
      'shopping.selectDaysDesc': 'Choose days to generate the list',
      'shopping.selectedMeals': 'meal(s) selected',
      'shopping.generateList': 'Generate list',
      'shopping.itemsAdded': '{count} item(s) added',
      'shopping.customItem': 'Custom item...',
    },
  }

export function createT(language) {
  return function t(key, params = {}) {
    const lang = translations[language] || translations.fr
    let text = lang[key] || translations.fr[key] || key
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, value)
    })
    return text
  }
}

export function getLocalizedName(item, language) {
  if (!item) return ''
  return language === 'en' ? (item.name_en || item.name_fr) : item.name_fr
}

export const SEASONS = ['winter', 'spring', 'summer', 'autumn']

export function getSeasonEmoji(season) {
  const emojis = { winter: '❄️', spring: '🌸', summer: '☀️', autumn: '🍂' }
  return emojis[season] || ''
}

export const DIFFICULTIES = ['easy', 'medium', 'hard']

export const MEAL_TYPES = ['appetizer', 'starter', 'main', 'side', 'dessert']

export function getMealTypeEmoji(mealType) {
  const emojis = { appetizer: '🥂', starter: '🥗', main: '🍽️', side: '🥔', dessert: '🍰' }
  return emojis[mealType] || '🍽️'
}

export const PRICE_RANGES = ['cheap', 'medium', 'expensive']

export function getPriceRangeSymbol(priceRange) {
  const symbols = { cheap: '€', medium: '€€', expensive: '€€€' }
  return symbols[priceRange] || '€€'
}
