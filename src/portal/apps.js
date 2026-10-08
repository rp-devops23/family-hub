// Liste unique des applications du hub (utilisée par l'accueil et par la navigation)

export const ASSISTANT = {
  id: 'agent',
  icon: '🤖',
  titleFr: 'Assistant IA',
  titleEn: 'AI Assistant',
  descFr: 'Posez une question, ajoutez une dépense, planifiez…',
  descEn: 'Ask a question, add an expense, plan ahead…',
  color: '#7C3AED',
  bg: '#F3EEFF',
};

export const GROUPS = [
  { id: 'daily', titleFr: 'Au quotidien', titleEn: 'Every day' },
  { id: 'home', titleFr: 'Maison & projets', titleEn: 'Home & projects' },
  { id: 'money', titleFr: 'Argent', titleEn: 'Money' },
];

export const APPS = [
  {
    id: 'recipes', group: 'daily', icon: '🍽️',
    titleFr: 'Recettes', titleEn: 'Recipes',
    descFr: 'Recettes, planning des repas & courses', descEn: 'Recipes, meal planning & groceries',
    color: '#5B5BD6', bg: '#EEEEFC',
  },
  {
    id: 'shopping', group: 'daily', icon: '🛍️',
    titleFr: 'Shopping', titleEn: 'Shopping',
    descFr: 'Vêtements, accessoires & cadeaux', descEn: 'Clothing, accessories & gifts',
    color: '#E5484D', bg: '#FEEEEE',
  },
  {
    id: 'corvees', group: 'daily', icon: '🧹',
    titleFr: 'Corvées', titleEn: 'Chores',
    descFr: 'Tâches ménagères de la famille', descEn: 'Household chores',
    color: '#12A150', bg: '#E8F8EF',
  },
  {
    id: 'travaux', group: 'home', icon: '🔨',
    titleFr: 'Travaux', titleEn: 'Home work',
    descFr: 'Projets, rénovations & budget', descEn: 'Projects, renovations & budget',
    color: '#A855F7', bg: '#F6EEFE',
  },
  {
    id: 'holiday', group: 'home', icon: '✈️',
    titleFr: 'Vacances', titleEn: 'Holidays',
    descFr: 'Checklists de préparation de voyage', descEn: 'Trip preparation checklists',
    color: '#F2803D', bg: '#FEF1E8',
  },
  {
    id: 'finance', group: 'money', icon: '💰',
    titleFr: 'Finances', titleEn: 'Finance',
    descFr: 'Budgets, transactions & analyses', descEn: 'Budgets, transactions & insights',
    color: '#0891B2', bg: '#E6F6FA',
  },
];

export const ALL_APPS = [...APPS, ASSISTANT];
export const isAppId = (id) => ALL_APPS.some(a => a.id === id);
export const getApp = (id) => ALL_APPS.find(a => a.id === id);

// --- Dernières applications ouvertes (stockage local, tolérant aux erreurs) ---
const RECENT_KEY = 'familyhub.recentApps';

export function getRecentApps() {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(ids) ? ids.filter(isAppId).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function pushRecentApp(id) {
  try {
    const next = [id, ...getRecentApps().filter(x => x !== id)].slice(0, 3);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* stockage indisponible : on ignore */ }
}
